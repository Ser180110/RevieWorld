"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Profile } from "@/lib/data/types";
import { compressImage } from "@/lib/compressImage";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/social/actions";
import { Avatar } from "./Avatar";
import { ProfileThemePicker } from "./ProfileThemePicker";

const field =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";
const MAX_BYTES = 2 * 1024 * 1024;

export function ProfileForm({
  lang,
  profile,
  t,
}: {
  lang: string;
  profile: Profile;
  t: Dictionary["settings"];
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {});
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploadError(false);
    setUploading(true);
    try {
      const photo = await compressImage(file, { maxSide: 512, quality: 0.85, maxBytes: MAX_BYTES });
      if (!photo) throw new Error("unsupported image");
      const ext = photo.ext;
      const supabase = createClient();
      // Path starts with the user id: storage policies only allow your own folder.
      const path = `${profile.id}/${Date.now().toString(36)}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, photo.blob, { contentType: photo.type, cacheControl: "31536000" });
      if (error) throw error;
      setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      console.error("avatar upload", e);
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  const label = (text: string, hint?: string) => (
    <span className="flex flex-col">
      <span className="text-sm font-medium">{text}</span>
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </span>
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="avatar_url" value={avatarUrl} />

      <div className="flex items-center gap-5">
        <Avatar url={avatarUrl || null} name={profile.username} size={80} />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t.avatar}</span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border border-zinc-300 px-3 py-1 text-sm hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100">
              {uploading ? t.avatarUploading : t.avatarChange}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="cursor-pointer text-sm text-zinc-500 hover:underline"
              >
                {t.avatarRemove}
              </button>
            )}
          </div>
          <span className={`text-xs ${uploadError ? "text-red-600" : "text-zinc-500"}`}>
            {uploadError ? t.avatarError : t.avatarHint}
          </span>
        </div>
      </div>

      <ProfileThemePicker
        initialBg={profile.theme_bg}
        initialEmoji={profile.theme_emoji}
        name={profile.display_name || profile.username}
        username={profile.username}
        avatarUrl={avatarUrl || null}
        badge={profile.badge}
        t={{
          title: t.themeTitle,
          hint: t.themeHint,
          solid: t.themeSolid,
          gradient: t.themeGradient,
          pattern: t.themePattern,
          none: t.themeNone,
        }}
      />

      <label className="flex flex-col gap-1">
        {label(t.username, t.usernameHint)}
        <input
          name="username"
          defaultValue={profile.username}
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]{3,30}"
          autoComplete="username"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1">
        {label(t.displayName, t.displayNameHint)}
        <input name="display_name" defaultValue={profile.display_name ?? ""} maxLength={60} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        {label(t.bio, t.bioHint)}
        <textarea
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          className={field}
        />
        <span className="self-end text-xs tabular-nums text-zinc-500">{bio.length}/500</span>
      </label>
      <label className="flex flex-col gap-1">
        {label(t.location)}
        <input name="location" defaultValue={profile.location ?? ""} maxLength={80} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        {label(t.website)}
        <input
          name="website"
          defaultValue={profile.website ?? ""}
          maxLength={200}
          inputMode="url"
          placeholder="https://"
          className={field}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors[state.error]}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || uploading}
          className="cursor-pointer rounded-full bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? t.saving : t.save}
        </button>
        <Link href={`/${lang}/u/${profile.username}`} className="text-sm text-zinc-500 hover:underline">
          {t.cancel}
        </Link>
      </div>
    </form>
  );
}
