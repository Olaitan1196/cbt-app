import { supabase } from '../lib/supabase';
import { getDeviceId } from '../hooks/useDeviceId';

// ============================================================
// CHECK IF A USERNAME IS ALREADY TAKEN
// ============================================================
// Called while the student is typing, before they submit the form.
export const checkUsernameAvailable = async (username) => {
  const { data, error } = await supabase.rpc('is_username_taken', {
    lookup_username: username,
  });

  if (error) {
    console.log('Username check error:', error);
    throw error;
  }

  // data is true if taken, false if available
  return !data;
};

// ============================================================
// CHECK IF A REFERRAL CODE IS REAL
// ============================================================
// Called before creating the account, so we can reject a bad
// code early instead of registering the student first.
// Returns the affiliate's ID if the code is valid, or null.
export const validateReferralCode = async (code) => {
  if (!code || !code.trim()) {
    return null;
  }

  const { data, error } = await supabase.rpc('validate_referral_code', {
    code: code.trim(),
  });

  if (error) {
    console.log('Referral code check error:', error);
    return null;
  }

  return data;
};

// ============================================================
// REGISTER A NEW STUDENT
// ============================================================
// Three steps happen here:
// 1. If a referral code was entered, confirm it's real BEFORE
//    creating the account.
// 2. Create the login account (handles email + password) using
//    Supabase's built-in auth system.
// 3. Create the profile row (username, name, state, LGA, class)
//    linked to that same account, PLUS link the student to the
//    affiliate who referred them, if any.
export const registerStudent = async ({
  email,
  password,
  username,
  fullName,
  state,
  lga,
  classLevel,
  referralCode,
}) => {
  // Step 1 — check username is free before we even try to create the account
  const isAvailable = await checkUsernameAvailable(username);
  if (!isAvailable) {
    throw new Error('This username is already taken. Please choose another one.');
  }

  // Step 2 — if a referral code was typed in, make sure it's real.
  // We do this BEFORE creating the account so a bad code stops
  // registration cleanly, instead of creating an account and then
  // silently failing to link it.
  let affiliateId = null;
  if (referralCode && referralCode.trim()) {
    affiliateId = await validateReferralCode(referralCode);
    if (!affiliateId) {
      throw new Error(
        'That referral code is not valid. Please check it, or leave it blank.'
      );
    }
  }

  // Step 3 — create the auth account AND attach the extra profile
  // details as metadata. The database trigger picks this up and
  // creates the profiles row automatically — we no longer do it
  // manually from the app.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: fullName,
        state,
        lga,
        class_level: classLevel,
      },
    },
  });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error('Registration failed. Please try again.');
  }

  // Step 4 — if the referral code was valid, record the link between
  // this student and the affiliate. If this fails for any reason, we
  // do NOT block registration — the account is already created, so we
  // just log it quietly instead of ruining the student's signup.
  if (affiliateId) {
    const { error: referralError } = await supabase
      .from('referred_students')
      .insert({
        affiliate_id: affiliateId,
        student_id: authData.user.id,
        referral_code_used: referralCode.trim().toUpperCase(),
      });

    if (referralError) {
      console.log('Could not link referral:', referralError);
    }
  }

  return authData.user;
};
// ============================================================
// LOG IN AN EXISTING STUDENT
// ============================================================
// The student can type EITHER their username OR their email.
// If what they typed contains "@", we treat it as an email directly.
// Otherwise, we look up the matching email for that username first.
export const loginStudent = async (identifier, password) => {
  let email = identifier.trim();

  const looksLikeEmail = email.includes('@');

  if (!looksLikeEmail) {
    const { data: foundEmail, error: lookupError } = await supabase.rpc(
      'get_email_by_username',
      { lookup_username: email }
    );

    if (lookupError) {
      throw lookupError;
    }

    if (!foundEmail) {
      throw new Error('No account found with that username.');
    }

    email = foundEmail;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Supabase tells us WHY it failed. We only want to show a specific
    // message for cases where the generic "wrong password" message
    // would be confusing or misleading. Everything else still shows
    // the safe, generic message so we don't leak account details.
    if (error.message === 'Email not confirmed') {
      throw new Error(
        'Please confirm your email address before logging in. Check your inbox for a confirmation email From SupabaseAuth.'
      );
    }

    if (error.message?.toLowerCase().includes('network')) {
      throw new Error(
        'Could not connect. Please check your internet connection and try again.'
      );
    }

    throw new Error('Incorrect username/email or password.');
  }

  // Claim this phone as the authorized device for this account.
  // This overwrites whatever device was previously authorized —
  // that old device will be signed out next time IT is opened.
  await claimDevice(data.user.id);

  return data.user;
};

// ============================================================
// LOG OUT
// ============================================================
export const logoutStudent = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

// ============================================================
// GET THE CURRENT LOGGED-IN STUDENT'S PROFILE
// ============================================================
// Used on the splash screen to decide where to send the student.
export const getCurrentProfile = async () => {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .single();

  if (error) {
    console.log('Error fetching profile:', error);
    return null;
  }

  return profile;
};

// ============================================================
// CLAIM THIS DEVICE AS THE AUTHORIZED ONE FOR THIS ACCOUNT
// ============================================================
// Called right after a successful login. Writes this phone's
// fingerprint into the devices table for this student. If the
// student was previously logged in on a different phone, that
// old phone is no longer authorized — it just doesn't know it yet.
export const claimDevice = async (userId) => {
  const deviceId = await getDeviceId();

  const { data: existing } = await supabase
    .from('devices')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('devices')
      .update({ device_fingerprint: deviceId })
      .eq('user_id', userId);
  } else {
    await supabase
      .from('devices')
      .insert({ user_id: userId, device_fingerprint: deviceId });
  }

  return deviceId;
};

// ============================================================
// CHECK IF THIS PHONE IS STILL THE AUTHORIZED DEVICE
// ============================================================
// Compares this phone's fingerprint against what's saved in the
// devices table for this student. Returns true if it matches
// (or if no device record exists yet, which shouldn't normally
// happen after login, but we treat it as authorized rather than
// locking someone out over a missing row).
export const isThisDeviceAuthorized = async (userId) => {
  const deviceId = await getDeviceId();

  const { data, error } = await supabase
    .from('devices')
    .select('device_fingerprint')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return true;
  }

  return data.device_fingerprint === deviceId;
};

// ============================================================
// GET PROFILE + CHECK DEVICE — USE THIS ON SPLASH AND DASHBOARD
// ============================================================
// Does everything getCurrentProfile() does, PLUS checks whether
// this phone is still the authorized device. If another device
// has taken over the account, this one is signed out automatically
// and we return kickedOut: true so the screen can show a message.
export const getCurrentProfileWithDeviceCheck = async () => {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { profile: null, kickedOut: false };
  }

  const authorized = await isThisDeviceAuthorized(profile.id);

  if (!authorized) {
    await logoutStudent();
    return { profile: null, kickedOut: true };
  }

  return { profile, kickedOut: false };
  
};
// ============================================================
// REQUEST A PASSWORD RESET EMAIL
// ============================================================
// Sends an email with a link that opens the PassOnce app directly
// to the Reset Password screen. Works whether the student typed
// their username or their email — same lookup logic as login.
export const requestPasswordReset = async (identifier) => {
  let email = identifier.trim();

  const looksLikeEmail = email.includes('@');

  if (!looksLikeEmail) {
    const { data: foundEmail, error: lookupError } = await supabase.rpc(
      'get_email_by_username',
      { lookup_username: email }
    );

    if (lookupError) {
      throw lookupError;
    }

    if (!foundEmail) {
      throw new Error('No account found with that username or email.');
    }

    email = foundEmail;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'passonce://reset-password',
  });

  if (error) {
    throw error;
  }

  return true;
};
// ============================================================
// UPDATE PASSWORD (used by both Reset Password and Change Password)
// ============================================================
// When called after tapping a reset-email link, Supabase has already
// placed the student into a temporary "recovery" session, so this
// just sets the new password directly — no old password needed.
// When called from Settings by an already logged-in student, it
// works the exact same way.
export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  return true;
};