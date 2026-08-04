import { Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export function ProfileField({ label, value, onChange, keyboardType = "default", placeholder }) {
  const { tokens } = useTheme();
  return (
    <View className="mb-4">
      <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={tokens.textDim}
        keyboardType={keyboardType}
        autoCapitalize="none"
        className="py-1.5"
        style={{ fontSize: 16, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
      />
    </View>
  );
}
