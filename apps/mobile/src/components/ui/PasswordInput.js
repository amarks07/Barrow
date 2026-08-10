import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";

// Same look as the plain password TextInputs it replaces (border-bottom,
// same font size), just with a reveal/hide toggle docked at the right edge.
export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  autoComplete,
  autoFocus,
  onSubmitEditing,
  className,
}) {
  const { tokens } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View
      className={className}
      style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        placeholder={placeholder}
        placeholderTextColor={tokens.textDim}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        className="py-1.5"
        style={{ flex: 1, fontSize: 16, color: tokens.text }}
      />
      <Pressable onPress={() => setVisible((v) => !v)} focusable={false} hitSlop={8} accessibilityLabel={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff size={18} color={tokens.textDim} /> : <Eye size={18} color={tokens.textDim} />}
      </Pressable>
    </View>
  );
}
