import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Mail, ScanLine, UserPlus } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { NotificationBadge } from "../ui/NotificationBadge";
import { ConfirmDeleteIconButton } from "../ui/ConfirmDeleteIconButton";
import { SwipeToDismissRow } from "../ui/SwipeToDismissRow";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function actorName(item) {
  return (
    item.actorUsername ||
    `${item.actorFirstName || ""} ${item.actorLastName || ""}`.trim() ||
    "Someone"
  );
}

// Reached from ProfileView's hub (or a friend-request push's tap target —
// see usePushNotificationNavigation). Renders whatever useNotifications
// hands back: the single local "missing biometrics" item (computed from
// `profile` itself, see getMissingProfileFields) plus the real
// notifications-table rows (friend requests/adds today, via
// list_notifications). Marks the table-backed rows read as soon as this
// screen is viewed, same as opening Friends already lets you see pending
// requests — the local item has no persisted read state and disappears on
// its own once the missing fields are filled in. Each row also has a
// ConfirmDeleteIconButton to dismiss it explicitly — see useNotifications'
// `dismiss` for how that differs between the two item kinds.
export function NotificationsView({ notifications, onBack, onNavigate }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, error, markAllRead, dismiss } = notifications;

  // Depends on `items` rather than running once on mount: if this screen is
  // opened before useNotifications' initial fetch resolves, `rows` (and so
  // `markAllRead`'s own read-check) would otherwise be stuck on the stale
  // empty-array closure captured at mount, silently no-opping once the real
  // rows arrive.
  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-5 pb-4" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Notifications</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
        {items.length === 0 && !loading ? (
          <Text style={{ fontSize: 12, color: tokens.textDim, textAlign: "center" }} className="mt-6">
            Nothing to see here yet.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {items.map((item) => {
              if (item.type === "local") {
                const fields = item.missingFields.join(", ");
                return (
                  <SwipeToDismissRow key={item.id} onDismiss={() => dismiss(item)}>
                    <Card style={{ padding: 12 }}>
                      <View className="flex-row items-center gap-3">
                        <Pressable onPress={() => onNavigate("biometrics")} className="flex-row items-center gap-3" style={{ flex: 1 }}>
                          <View
                            className="items-center justify-center"
                            style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
                          >
                            <ScanLine size={16} color={tokens.textDim} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, color: tokens.text }}>Complete your profile</Text>
                            <Text style={{ fontSize: 11, color: tokens.textDim }}>Missing {fields}</Text>
                          </View>
                        </Pressable>
                        <NotificationBadge borderColor={tokens.surface} />
                        <ConfirmDeleteIconButton onConfirm={() => dismiss(item)} label="Dismiss notification" size={18} standardSize />
                      </View>
                    </Card>
                  </SwipeToDismissRow>
                );
              }

              if (item.type === "message") {
                return (
                  <SwipeToDismissRow key={item.id} onDismiss={() => dismiss(item)}>
                    <Card style={{ padding: 12 }}>
                      <View className="flex-row items-center gap-3">
                        <View
                          className="items-center justify-center"
                          style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
                        >
                          <Mail size={16} color={tokens.textDim} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: tokens.text, fontWeight: "600" }} numberOfLines={2}>
                            {item.data?.header || "Notification"}
                          </Text>
                          {item.data?.body ? (
                            <Text style={{ fontSize: 12, color: tokens.textDim, marginTop: 2 }} numberOfLines={4}>
                              {item.data.body}
                            </Text>
                          ) : null}
                          <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2 }}>{relativeTime(item.createdAt)}</Text>
                        </View>
                        {!item.read && <NotificationBadge borderColor={tokens.surface} />}
                        <ConfirmDeleteIconButton onConfirm={() => dismiss(item)} label="Dismiss notification" size={18} standardSize />
                      </View>
                    </Card>
                  </SwipeToDismissRow>
                );
              }

              const isFriendRequest = item.type === "friend_request";
              const isFriendType = isFriendRequest || item.type === "friend_added";
              return (
                <SwipeToDismissRow key={item.id} onDismiss={() => dismiss(item)}>
                  <Card style={{ padding: 12 }}>
                    <View className="flex-row items-center gap-3">
                      <Pressable onPress={() => onNavigate("friends")} className="flex-row items-center gap-3" style={{ flex: 1 }}>
                        {isFriendType ? (
                          <Avatar pictureUrl={item.actorPictureUrl} firstName={item.actorFirstName} lastName={item.actorLastName} size={36} />
                        ) : (
                          <View
                            className="items-center justify-center"
                            style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: tokens.surface, borderWidth: 1.5, borderColor: tokens.lineStrong }}
                          >
                            <UserPlus size={16} color={tokens.textDim} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: tokens.text }} numberOfLines={2}>
                            {isFriendType
                              ? `${actorName(item)} ${isFriendRequest ? "sent you a friend request" : "added you as a friend"}`
                              : "New notification"}
                          </Text>
                          <Text style={{ fontSize: 11, color: tokens.textDim, marginTop: 2 }}>{relativeTime(item.createdAt)}</Text>
                        </View>
                      </Pressable>
                      {!item.read && <NotificationBadge borderColor={tokens.surface} />}
                      <ConfirmDeleteIconButton onConfirm={() => dismiss(item)} label="Dismiss notification" size={18} standardSize />
                    </View>
                  </Card>
                </SwipeToDismissRow>
              );
            })}
          </View>
        )}

        {error ? (
          <Text style={{ fontSize: 12, color: tokens.danger, textAlign: "center" }} className="mt-4">
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
