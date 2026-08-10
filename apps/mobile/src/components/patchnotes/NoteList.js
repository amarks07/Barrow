import { Text, View } from "react-native";
import { FONT_DISPLAY } from "../../theme/fonts";
import { PATCH_NOTE_CATEGORIES } from "../../content/patchNotes";

// Shared renderer for a PATCH_NOTES entry's `notes`, used by both
// PatchNotesView (full history) and PatchNotesModal (single-entry popup) so
// the category/section layout only needs to be gotten right once. `features`
// is an array of { section, items } groups; other categories are flat
// string arrays — see patchNotes.js.
export function NoteList({ notes, tokens }) {
  return (
    <>
      {PATCH_NOTE_CATEGORIES.map(({ key, label }) => {
        const group = notes[key];
        if (!group || group.length === 0) return null;
        const sectioned = typeof group[0] === "object";

        return (
          <View key={key} className="mb-4">
            <Text
              style={{ fontFamily: FONT_DISPLAY, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: tokens.accent }}
              className="mb-2"
            >
              {label}
            </Text>
            {sectioned ? (
              <View style={{ gap: 10 }}>
                {group.map((sub) => (
                  <View key={sub.section}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: tokens.text }} className="mb-1">
                      {sub.section}
                    </Text>
                    <Bullets items={sub.items} tokens={tokens} />
                  </View>
                ))}
              </View>
            ) : (
              <Bullets items={group} tokens={tokens} />
            )}
          </View>
        );
      })}
    </>
  );
}

function Bullets({ items, tokens }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((note, i) => (
        <View key={i} className="flex-row" style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>•</Text>
          <Text style={{ flex: 1, fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>{note}</Text>
        </View>
      ))}
    </View>
  );
}
