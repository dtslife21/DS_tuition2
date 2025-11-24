import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const toTrimmed = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
};

const joinName = (first, last) =>
  [toTrimmed(first), toTrimmed(last)].filter(Boolean).join(" ");

const resolveDisplayName = (nameProp, user) => {
  const direct = toTrimmed(nameProp);
  if (direct) {
    return direct;
  }

  if (!user || typeof user !== "object") {
    return "";
  }

  const candidates = [
    user.name,
    user.fullName,
    joinName(user.FirstName ?? user.firstName, user.LastName ?? user.lastName),
    user.displayName,
    user.DisplayName,
    user.username ?? user.Username,
    user.email ?? user.Email,
  ];

  for (const candidate of candidates) {
    const value = toTrimmed(candidate);
    if (value) {
      return value;
    }
  }

  return "";
};

const profileFieldCandidates = (target) => {
  if (!target || typeof target !== "object") {
    return [];
  }

  return [
    target.profilePicture,
    target.ProfilePicture,
    target.profile_photo,
    target.profilephoto,
    target.photo,
    target.Photo,
    target.photoUrl,
    target.PhotoUrl,
    target.photoURL,
    target.picture,
    target.Picture,
    target.avatar,
    target.Avatar,
    target.image,
    target.Image,
    target.imageUrl,
    target.ImageUrl,
  ];
};

const getProfilePhotoVersion = (target) => {
  if (!target || typeof target !== "object") {
    return null;
  }

  const candidates = [
    target.profilePictureVersion,
    target.ProfilePictureVersion,
    target.profilePictureUpdatedAt,
    target.ProfilePictureUpdatedAt,
    target.profilePhotoVersion,
    target.ProfilePhotoVersion,
    target.profile_photo_version,
    target.profilephotoVersion,
    target.profile_photo_updated_at,
    target.ProfilePhotoUpdatedAt,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }
    const trimmed = toTrimmed(candidate);
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
};

const appendCacheBuster = (url, cacheKey) => {
  if (!url) {
    return url;
  }

  if (cacheKey === undefined || cacheKey === null) {
    return url;
  }

  if (/^(data:|blob:)/i.test(url)) {
    return url;
  }

  const key = toTrimmed(cacheKey);
  if (!key) {
    return url;
  }

  const [basePart, fragmentPart] = url.split("#", 2);
  const queryIndex = basePart.indexOf("?");
  const path = queryIndex === -1 ? basePart : basePart.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : basePart.slice(queryIndex + 1);

  let params;
  try {
    params = new URLSearchParams(query);
  } catch (err) {
    params = null;
  }

  if (!params) {
    const separator = path.includes("?") ? "&" : "?";
    const rebuilt = `${path}${separator}cb=${encodeURIComponent(key)}`;
    return fragmentPart !== undefined ? `${rebuilt}#${fragmentPart}` : rebuilt;
  }

  params.set("cb", key);
  const queryString = params.toString();
  const rebuilt = `${path}${queryString ? `?${queryString}` : ""}`;
  return fragmentPart !== undefined ? `${rebuilt}#${fragmentPart}` : rebuilt;
};

const getServerBaseUrl = (() => {
  let memoized;
  return () => {
    if (memoized !== undefined) {
      return memoized;
    }

    const envCandidates = [
      process.env.REACT_APP_API_BASE_URL,
      process.env.REACT_APP_BACKEND_BASE_URL,
      process.env.REACT_APP_BACKEND_URL,
    ];

    let base = envCandidates.find((candidate) => toTrimmed(candidate));
    if (base) {
      base = toTrimmed(base);
    }

    if (!base && axios?.defaults?.baseURL) {
      base = toTrimmed(axios.defaults.baseURL);
    }

    if (base) {
      try {
        const resolved = new URL(base);
        const cleanedPath = resolved.pathname
          .replace(/\/api\/?$/, "")
          .replace(/\/$/, "");
        memoized =
          cleanedPath && cleanedPath !== "/"
            ? `${resolved.origin}${cleanedPath}`
            : resolved.origin;
        return memoized;
      } catch (err) {
        if (/^https?:\/\//i.test(base)) {
          memoized = base.replace(/\/$/, "").replace(/\/api\/?$/, "");
          return memoized;
        }
      }
    }

    if (typeof window !== "undefined" && window.location) {
      memoized = window.location.origin;
      return memoized;
    }

    memoized = "";
    return memoized;
  };
})();

const normalizeToAbsoluteUrl = (value) => {
  const raw = toTrimmed(value);
  if (!raw) {
    return "";
  }

  if (/^(data:|blob:)/i.test(raw)) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^\/\//.test(raw)) {
    if (typeof window !== "undefined" && window.location) {
      return `${window.location.protocol}${raw}`;
    }
    return `https:${raw}`;
  }

  let normalized = raw.replace(/\\/g, "/");
  normalized = normalized.replace(/^~\//, "");
  normalized = normalized.replace(/^\.\//, "");

  const base = getServerBaseUrl();
  if (base) {
    try {
      return new URL(
        normalized,
        base.endsWith("/") ? base : `${base}/`
      ).toString();
    } catch (_) {
      const baseClean = base.replace(/\/$/, "");
      const pathClean = normalized.replace(/^\/+/, "");
      return `${baseClean}/${pathClean}`;
    }
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const resolvePhotoSource = (srcProp, user) => {
  const userVersion = getProfilePhotoVersion(user);
  const direct = normalizeToAbsoluteUrl(srcProp);
  if (direct) {
    return appendCacheBuster(direct, userVersion);
  }

  const targets = [];
  if (user && typeof user === "object") {
    targets.push(user);
    if (user.raw && typeof user.raw === "object") {
      targets.push(user.raw);
    }
  }

  for (const target of targets) {
    const targetVersion = getProfilePhotoVersion(target) ?? userVersion;
    const candidates = profileFieldCandidates(target);
    for (const candidate of candidates) {
      const resolved = normalizeToAbsoluteUrl(candidate);
      if (resolved) {
        return appendCacheBuster(resolved, targetVersion);
      }
    }
  }

  return "";
};

const getInitials = (value) => {
  const name = toTrimmed(value);
  if (!name) {
    return "";
  }

  const segments = name.split(/\s+/).filter(Boolean);
  if (!segments.length) {
    return "";
  }

  const first = segments[0]?.[0] ?? "";
  const last = segments.length > 1 ? segments[segments.length - 1]?.[0] : "";
  return `${first ?? ""}${last ?? ""}`.toUpperCase();
};

const Avatar = ({ name, size = "md", src, user, className = "" }) => {
  const [imageError, setImageError] = useState(false);

  const displayName = useMemo(
    () => resolveDisplayName(name, user),
    [name, user]
  );
  const targetSrc = useMemo(() => resolvePhotoSource(src, user), [src, user]);

  useEffect(() => {
    setImageError(false);
  }, [targetSrc]);

  const sizeKey = sizeClasses[size] ? size : "md";
  const showImage = Boolean(targetSrc) && !imageError;
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const classes = [
    "inline-flex items-center justify-center rounded-full overflow-hidden",
    sizeClasses[sizeKey],
    showImage ? "bg-gray-100 dark:bg-gray-800" : "bg-indigo-500 text-white",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      title={displayName}
      role="img"
      aria-label={displayName || "User avatar"}
    >
      {showImage ? (
        <img
          className="h-full w-full object-cover"
          src={targetSrc}
          alt={displayName || "User avatar"}
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
