const Avatar = ({ name, size = "md", src }) => {
  const getInitials = (name) => {
    if (!name) return "";
    const names = name.split(" ");
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-24 w-24 text-3xl",
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-indigo-500 text-white ${sizeClasses[size]}`}
    >
      {src ? (
        <img
          className="rounded-full h-full w-full object-cover"
          src={src}
          alt={name}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};

export default Avatar;
