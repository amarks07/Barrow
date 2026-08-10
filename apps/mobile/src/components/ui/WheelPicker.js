import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export const WHEEL_ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS;
export const WHEEL_PADDING = WHEEL_ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

// One vertical scrolling/snapping dial column, iOS-picker style. Built on
// plain FlatList snapping rather than a native picker dependency, since none
// is installed and adding one would need a prebuild.
//
// `editable` opts a column into tap-to-type: only usable when `items` is a
// contiguous ascending run of integers one apart (day/year/feet/inches/
// weight — not month's Jan..Dec labels). `valueBase` is the numeric value
// of items[0] — passed explicitly rather than parsed back out of the
// label, since some of those labels carry a decorative suffix (feet's `3'`,
// inches' `11"`) that Number() can't read through. Tapping the centered
// value swaps it for a TextInput; committing clamps the typed number into
// [valueBase, valueBase + items.length - 1] and maps it straight to an
// index.
export function WheelPicker({ items, selectedIndex, onChange, width = 64, showHighlight = true, editable = false, valueBase = 0 }) {
  const { tokens } = useTheme();
  const listRef = useRef(null);
  // Swallows the onMomentumScrollEnd fired by the effect's own programmatic
  // scrollToOffset (e.g. when `items` shrinks because the month changed and
  // the day column has to re-clamp) so that resync doesn't get mistaken for
  // a user scroll and re-fire onChange right back.
  const isSyncingRef = useRef(false);
  // Set right before a scroll-driven onChange fires, so the effect below
  // can tell "selectedIndex changed because the list itself just landed
  // there" apart from an externally-driven change (initial mount, a tab
  // switch, or the day column re-clamping when the month changes). Only
  // the latter needs the imperative scrollToOffset — forcing it after a
  // user gesture yanks the row out of the native snap animation that's
  // already smoothly landing it there, which is what made releases feel
  // laggy/double-animated instead of clicking straight into place.
  const selfCommitRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    const wasSelfCommit = selfCommitRef.current === selectedIndex;
    selfCommitRef.current = null;
    if (wasSelfCommit) return;
    isSyncingRef.current = true;
    listRef.current?.scrollToOffset({ offset: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, items.length]);

  const commitFromOffset = (offsetY) => {
    const index = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    if (clamped !== selectedIndex) {
      selfCommitRef.current = clamped;
      onChange(clamped);
    }
  };

  const handleMomentumEnd = (e) => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    commitFromOffset(e.nativeEvent.contentOffset.y);
  };

  // iOS never fires onMomentumScrollBegin/End when a drag is released with
  // ~zero velocity right at (or very near) a snap point — there's no
  // momentum to animate, so the list is already at rest but onChange would
  // otherwise wait indefinitely for a callback that never comes. Below a
  // small velocity threshold, treat the release itself as the commit point;
  // faster flicks still travel further and resolve via onMomentumScrollEnd.
  const handleScrollEndDrag = (e) => {
    if (isSyncingRef.current) return;
    const velocityY = e.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(velocityY) < 0.05) commitFromOffset(e.nativeEvent.contentOffset.y);
  };

  const maxValue = valueBase + items.length - 1;

  const startEditing = () => {
    setText(String(valueBase + selectedIndex));
    setEditing(true);
  };

  const commitEdit = () => {
    const parsed = Math.round(Number(text));
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(valueBase, Math.min(maxValue, parsed));
      const index = clamped - valueBase;
      if (index !== selectedIndex) onChange(index);
    }
    setEditing(false);
  };

  return (
    <View style={{ width, height: WHEEL_HEIGHT }}>
      {showHighlight ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: WHEEL_PADDING,
            left: 0,
            right: 0,
            height: WHEEL_ITEM_HEIGHT,
            borderTopWidth: 1.5,
            borderBottomWidth: 1.5,
            borderColor: tokens.lineStrong,
          }}
        />
      ) : null}

      {editing ? (
        // Covers the FlatList's own centered row while typing — scroll is
        // turned off below so the two can't fight over the same gesture,
        // and this opaque background hides the row underneath rather than
        // overlapping it.
        <View
          style={{
            position: "absolute",
            top: WHEEL_PADDING,
            left: 0,
            right: 0,
            height: WHEEL_ITEM_HEIGHT,
            backgroundColor: tokens.bg,
            zIndex: 1,
          }}
        >
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            keyboardType="number-pad"
            selectTextOnFocus
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontVariant: ["tabular-nums"],
              fontWeight: "700",
              color: tokens.text,
              padding: 0,
            }}
          />
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!editing}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_PADDING + WHEEL_ITEM_HEIGHT * i, index: i })}
        contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item, index }) => {
          const row = (
            <View style={{ height: WHEEL_ITEM_HEIGHT, alignItems: "center", justifyContent: "center" }}>
              <Text
                style={{
                  fontSize: 17,
                  fontVariant: ["tabular-nums"],
                  color: index === selectedIndex ? tokens.text : tokens.textDim,
                  fontWeight: index === selectedIndex ? "700" : "400",
                }}
              >
                {item.label}
              </Text>
            </View>
          );
          // A plain Pressable wrapping one FlatList row — not an overlay
          // sitting on top of the whole list — so this reuses the same
          // tap-vs-drag negotiation any tappable row inside a FlatList
          // already gets, instead of risking a dead zone that swallows
          // scroll gestures the way an absolutely-positioned sibling would.
          if (!editable || index !== selectedIndex) return row;
          return (
            <Pressable onPress={startEditing} accessibilityLabel={`Type a value, currently ${item.label}`}>
              {row}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
