import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, QrCode, ScanLine } from "lucide-react-native";
import { IconBtn } from "../ui/IconBtn";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { ConfirmActionModal } from "../ui/ConfirmActionModal";
import { ErrorModal } from "../ui/ErrorModal";
import { ShareFriendQRModal } from "./ShareFriendQRModal";
import { ScanFriendQRModal } from "./ScanFriendQRModal";
import { useFriends } from "../../hooks/useFriends";
import { useTheme } from "../../theme/ThemeProvider";
import { FONT_DISPLAY } from "../../theme/fonts";

const SEARCH_DEBOUNCE_MS = 300;

function displayName(p) {
  return p.username || `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.publicId;
}

// Reached from ProfileView's hub, same "page" pattern as BiometricsView.
// Profile ID + QR share/scan up top mirror what's already on ProfileView's
// own hub, then search (name/username/Profile ID/exact email — see
// search_profiles in supabase/schema.sql) and the request/friends lists,
// all backed by useFriends. Scanning a QR code adds instantly (no accept
// step); a search-based "Add" sends a request the other person must accept.
export function FriendsView({ session, profile, onBack }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { friendships, loading, error, addByPublicId, sendRequest, respond, remove, search } = useFriends(session);

  const [showShareQR, setShowShareQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  // Target ids with an in-flight "Add" tap — disables that row's button
  // without a global loading flag blocking every other row.
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [removeTarget, setRemoveTarget] = useState(null); // friendship row being confirmed for removal
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const rows = await search(q);
        if (!cancelled) {
          setResults(rows);
          setSearchError(null);
        }
      } catch (e) {
        if (!cancelled) setSearchError(e.message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, search]);

  const handleAdd = async (targetId) => {
    setPendingIds((s) => new Set(s).add(targetId));
    try {
      await sendRequest(targetId);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(targetId);
        return next;
      });
    }
  };

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.isIncoming);
  const outgoing = friendships.filter((f) => f.status === "pending" && !f.isIncoming);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-5 pb-4" style={{ borderBottomWidth: 1.5, borderBottomColor: tokens.line }}>
        <IconBtn label="Back" onPress={onBack}>
          <ArrowLeft size={17} color={tokens.text} />
        </IconBtn>
        <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: tokens.text }}>Friends</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
        <Text style={{ fontSize: 11, color: tokens.textDim }} className="mb-1">
          Profile ID
        </Text>
        <Text style={{ fontSize: 14, color: tokens.textDim, fontVariant: ["tabular-nums"] }} className="mb-4">
          {profile.profileId || "Unavailable"}
        </Text>

        <View className="flex-row justify-between mb-6">
          <Button label="My QR code" onPress={() => setShowShareQR(true)} icon={<QrCode size={15} color={tokens.textDim} />} size="medium" />
          <Button
            label="Scan a QR code"
            onPress={() => setShowScanQR(true)}
            icon={<ScanLine size={15} color={tokens.textDim} />}
            size="medium"
          />
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, username, Profile ID, or email"
          placeholderTextColor={tokens.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          className="py-1.5 mb-4"
          style={{ fontSize: 15, color: tokens.text, borderBottomWidth: 1, borderBottomColor: tokens.lineStrong }}
        />

        {query.trim().length >= 2 && (
          <View style={{ gap: 8 }} className="mb-6">
            {searching ? (
              <ActivityIndicator color={tokens.textDim} />
            ) : searchError ? (
              <Text style={{ fontSize: 12, color: tokens.danger }}>{searchError}</Text>
            ) : results.length === 0 ? (
              <Text style={{ fontSize: 12, color: tokens.textDim }}>No one found matching "{query.trim()}".</Text>
            ) : (
              results.map((r) => {
                const existing = friendships.find((f) => f.id === r.id);
                const state = !existing ? "none" : existing.status === "accepted" ? "friends" : existing.isIncoming ? "respond" : "requested";
                return (
                  <Card key={r.id} style={{ padding: 12 }}>
                    <View className="flex-row items-center gap-3">
                      <Avatar pictureUrl={r.pictureUrl} firstName={r.firstName} lastName={r.lastName} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: tokens.text }}>{displayName(r)}</Text>
                        <Text style={{ fontSize: 11, color: tokens.textDim }}>{r.publicId}</Text>
                      </View>
                      {state === "friends" && <Text style={{ fontSize: 11, color: tokens.textDim }}>Friends</Text>}
                      {state === "requested" && <Text style={{ fontSize: 11, color: tokens.textDim }}>Requested</Text>}
                      {state === "respond" && <Text style={{ fontSize: 11, color: tokens.textDim }}>See requests below</Text>}
                      {state === "none" && (
                        <Button
                          label={pendingIds.has(r.id) ? "…" : "Add"}
                          onPress={() => handleAdd(r.id)}
                          disabled={pendingIds.has(r.id)}
                          size="small"
                        />
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {incoming.length > 0 && (
          <View className="mb-6">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
              Requests
            </Text>
            <View style={{ gap: 8 }}>
              {incoming.map((f) => (
                <Card key={f.friendshipId} style={{ padding: 12 }}>
                  <View className="flex-row items-center gap-3">
                    <Avatar pictureUrl={f.pictureUrl} firstName={f.firstName} lastName={f.lastName} size={36} />
                    <Text style={{ flex: 1, fontSize: 13, color: tokens.text }} numberOfLines={1}>
                      {displayName(f)}
                    </Text>
                    <View className="flex-row gap-2">
                      <Button label="Decline" onPress={() => respond(f.friendshipId, false).catch((e) => setActionError(e.message))} size="small" />
                      <Button
                        label="Accept"
                        onPress={() => respond(f.friendshipId, true).catch((e) => setActionError(e.message))}
                        variant="solid"
                        size="small"
                      />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {outgoing.length > 0 && (
          <View className="mb-6">
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
              Sent requests
            </Text>
            <View style={{ gap: 8 }}>
              {outgoing.map((f) => (
                <Card key={f.friendshipId} style={{ padding: 12 }}>
                  <View className="flex-row items-center gap-3">
                    <Avatar pictureUrl={f.pictureUrl} firstName={f.firstName} lastName={f.lastName} size={36} />
                    <Text style={{ flex: 1, fontSize: 13, color: tokens.text }} numberOfLines={1}>
                      {displayName(f)}
                    </Text>
                    <Button label="Cancel" onPress={() => respond(f.friendshipId, false).catch((e) => setActionError(e.message))} size="small" />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        <View>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 13, textTransform: "uppercase", color: tokens.textDim }} className="mb-2">
            Friends{accepted.length > 0 ? ` (${accepted.length})` : ""}
          </Text>
          {loading && friendships.length === 0 ? (
            <ActivityIndicator color={tokens.textDim} />
          ) : accepted.length === 0 ? (
            <Text style={{ fontSize: 12, color: tokens.textDim }}>No friends yet — search above or share your QR code.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {accepted.map((f) => (
                <Card key={f.friendshipId} style={{ padding: 12 }}>
                  <View className="flex-row items-center gap-3">
                    <Avatar pictureUrl={f.pictureUrl} firstName={f.firstName} lastName={f.lastName} size={36} />
                    <Text style={{ flex: 1, fontSize: 13, color: tokens.text }} numberOfLines={1}>
                      {displayName(f)}
                    </Text>
                    <Button label="Remove" onPress={() => setRemoveTarget(f)} size="small" />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {error ? (
          <Text style={{ fontSize: 12, color: tokens.danger, textAlign: "center" }} className="mt-4">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {showShareQR && <ShareFriendQRModal publicId={profile.profileId} onClose={() => setShowShareQR(false)} />}
      {showScanQR && <ScanFriendQRModal addByPublicId={addByPublicId} onClose={() => setShowScanQR(false)} />}
      {removeTarget && (
        <ConfirmActionModal
          title="Remove friend"
          message={`Remove ${displayName(removeTarget)} from your friends? They'll need to add you again to reconnect.`}
          confirmLabel="Remove"
          onConfirm={async () => {
            try {
              await remove(removeTarget.friendshipId);
              setRemoveTarget(null);
            } catch (e) {
              setActionError(e.message);
            }
          }}
          onClose={() => setRemoveTarget(null)}
        />
      )}
      {actionError && <ErrorModal title="Something went wrong" message={actionError} onClose={() => setActionError(null)} />}
    </View>
  );
}
