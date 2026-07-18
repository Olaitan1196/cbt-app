// A drop-in replacement for React Native's TextInput.
// It always sets a visible text color and placeholder color,
// so no screen can ever ship the "invisible white text" bug again.
// Any style you pass in through `style` is still applied on top,
// so per-screen sizing/borders/etc still work exactly the same.

import React from "react";
import { TextInput } from "react-native";
import { COLORS } from "../constants/colors";

export default function AppTextInput({ style, placeholderTextColor, ...rest }) {
  return (
    <TextInput
      style={[{ color: COLORS.textDark }, style]}
      placeholderTextColor={placeholderTextColor || COLORS.textLight}
      {...rest}
    />
  );
}