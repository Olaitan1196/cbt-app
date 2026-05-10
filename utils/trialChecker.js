import { getDb } from '../database/db';

// Returns true if student can still use app free
export const isTrialActive = async (deviceId) => {
  const db = getDb();

  // First check if device has paid license
  const license = await db.getFirstAsync(
    'SELECT * FROM license WHERE device_id = ? AND is_active = 1',
    [deviceId]
  );

  if (license) return { allowed: true, reason: 'paid' };

  // Check trial start date
  const student = await db.getFirstAsync(
    'SELECT trial_start_date FROM student WHERE device_id = ?',
    [deviceId]
  );

  if (!student) return { allowed: true, reason: 'new_user' };

  const startDate = new Date(student.trial_start_date);
  const today = new Date();
  const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) {
    return { allowed: true, reason: 'trial', daysLeft: 3 - diffDays };
  }

  return { allowed: false, reason: 'trial_expired' };
};