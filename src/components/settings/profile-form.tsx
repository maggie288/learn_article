"use client";

import { useEffect, useState } from "react";

type KnowledgeLevel = "explorer" | "builder" | "researcher";

interface Profile {
  knowledgeLevel: KnowledgeLevel;
  preferredLanguage: string;
  name: string | null;
  email: string;
}

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/user/profile");
      const json = (await res.json()) as {
        success: boolean;
        data?: { profile: Profile };
        error?: { message: string };
      };
      if (res.ok && json.success && json.data?.profile) {
        setProfile(json.data.profile);
      } else {
        setError(json.error?.message ?? "Failed to load profile.");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        knowledgeLevel: profile.knowledgeLevel,
        preferredLanguage: profile.preferredLanguage,
      }),
    });

    const json = (await res.json()) as {
      success: boolean;
      data?: { profile: Profile };
      error?: { message: string };
    };

    if (res.ok && json.success) {
      setSaved(true);
      if (json.data?.profile) setProfile(json.data.profile);
    } else {
      setError(json.error?.message ?? "Failed to save.");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="text-slate-400">Loading profile...</div>;
  }

  if (error && !profile) {
    return <div className="text-rose-300">{error}</div>;
  }

  if (!profile) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400">Knowledge level</label>
        <select
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
          value={profile.knowledgeLevel}
          onChange={(e) =>
            setProfile({
              ...profile,
              knowledgeLevel: e.target.value as KnowledgeLevel,
            })
          }
        >
          <option value="explorer">Explorer</option>
          <option value="builder">Builder</option>
          <option value="researcher">Researcher</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-slate-400">Preferred language</label>
        <input
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
          type="text"
          value={profile.preferredLanguage}
          onChange={(e) =>
            setProfile({ ...profile, preferredLanguage: e.target.value })
          }
          placeholder="e.g. zh-CN, en"
        />
      </div>
      <button
        className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
        type="submit"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save profile"}
      </button>
      {saved ? (
        <span className="ml-3 text-sm text-emerald-400">Saved.</span>
      ) : null}
      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
    </form>
  );
}
