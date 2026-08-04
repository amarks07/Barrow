import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";

// A title that reads as plain text until tapped, then becomes an editable
// input — mirrors the web app's tap-to-edit pattern.
export function EditableTitle({ value, onChange, placeholder = "", textStyle, className = "" }) {
  const { tokens } = useTheme();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={() => setEditing(false)}
        onSubmitEditing={() => setEditing(false)}
        placeholder={placeholder}
        placeholderTextColor={tokens.textDim}
        autoFocus
        className={`w-full ${className}`}
        style={[{ color: tokens.text, padding: 0 }, textStyle]}
      />
    );
  }

  return (
    <Pressable onPress={() => setEditing(true)} accessibilityLabel="Edit name" className={`w-full flex-row items-center gap-1.5 ${className}`}>
      <View className="shrink">
        <Text numberOfLines={1} style={[{ color: tokens.text }, textStyle]}>
          {value || placeholder}
        </Text>
      </View>
      <Pencil size={12} color={tokens.textDim} />
    </Pressable>
  );
}
