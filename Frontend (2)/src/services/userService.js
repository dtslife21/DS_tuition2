const API_URL = "http://localhost:50447/api/Users";

const ensureArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.results)) {
      return payload.results;
    }
    if (Array.isArray(payload.users)) {
      return payload.users;
    }
    if (Array.isArray(payload.Users)) {
      return payload.Users;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
    if (Array.isArray(payload.students)) {
      return payload.students;
    }
    if (Array.isArray(payload.Students)) {
      return payload.Students;
    }
  }

  return [];
};

const resolveUserType = (user) => {
  const mappedId =
    user?.UserTypeID ?? user?.userTypeID ?? user?.userTypeId ?? user?.RoleID;
  const providedType =
    user?.UserType ??
    user?.userType ??
    user?.Role ??
    user?.role ??
    user?.userTypeName ??
    user?.UserTypeName ??
    "";

  if (providedType) {
    return String(providedType).toLowerCase();
  }

  if (mappedId === undefined || mappedId === null) {
    return "";
  }

  const typeMap = {
    1: "admin",
    2: "teacher",
    3: "student",
  };

  return typeMap[mappedId] ?? String(mappedId);
};

const mapUser = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  const resolvedId =
    user.UserID ??
    user.userID ??
    user.userId ??
    user.id ??
    user.User?.UserID ??
    user.User?.id ??
    null;

  const firstName =
    user.FirstName ??
    user.firstName ??
    user.UserFirstName ??
    user.userFirstName ??
    user.Name?.First ??
    user.name?.first ??
    "";

  const lastName =
    user.LastName ??
    user.lastName ??
    user.UserLastName ??
    user.userLastName ??
    user.Name?.Last ??
    user.name?.last ??
    "";

  const email =
    user.Email ??
    user.email ??
    user.UserEmail ??
    user.userEmail ??
    user.ContactEmail ??
    user.contactEmail ??
    "";

  const username =
    user.Username ?? user.username ?? user.UserName ?? user.userName ?? "";

  const profilePicture =
    user.ProfilePicture ??
    user.profilePicture ??
    user.Avatar ??
    user.avatar ??
    null;

  const phone =
    user.Phone ??
    user.phone ??
    user.ContactNumber ??
    user.contactNumber ??
    user.Telephone ??
    user.telephone ??
    "";

  const userTypeId =
    user.UserTypeID ??
    user.userTypeID ??
    user.userTypeId ??
    user.RoleID ??
    null;

  const isActive = user.IsActive ?? user.isActive ?? true;

  const userRecord = {
    id: resolvedId,
    userId: resolvedId,
    UserID: resolvedId,
    userID: resolvedId,
    username,
    Username: username,
    email,
    Email: email,
    firstName,
    FirstName: firstName,
    lastName,
    LastName: lastName,
    userType: resolveUserType(user),
    userTypeId,
    userTypeID: userTypeId,
    UserTypeID: userTypeId,
    profilePicture,
    ProfilePicture: profilePicture,
    phone,
    Phone: phone,
    isActive,
    IsActive: isActive,
    raw: user,
  };

  const studentId =
    user.StudentID ??
    user.studentID ??
    user.studentId ??
    user.Student?.StudentID ??
    user.Student?.studentId ??
    null;

  if (studentId !== undefined && studentId !== null) {
    userRecord.studentId = studentId;
    userRecord.StudentID = studentId;
  }

  const teacherId =
    user.TeacherID ??
    user.teacherID ??
    user.teacherId ??
    user.Teacher?.TeacherID ??
    user.Teacher?.teacherId ??
    null;

  if (teacherId !== undefined && teacherId !== null) {
    userRecord.teacherId = teacherId;
    userRecord.TeacherID = teacherId;
  }

  return userRecord;
};

const mapUsers = (payload) =>
  ensureArray(payload)
    .map(mapUser)
    .filter((user) => Boolean(user));

export const getAllUsers = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  const payload = await response.json();
  const users = mapUsers(payload);
  return users.length ? users : mapUsers(payload?.data ?? []);
};

export const getUserById = async (userID) => {
  const response = await fetch(`${API_URL}/${userID}`);
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }

  const payload = await response.json();
  return mapUser(payload) ?? null;
};

export const createUser = async (userData) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error("Failed to create user");
  }

  const payload = await response.json();
  return mapUser(payload) ?? payload;
};

export const updateUser = async (userID, userData) => {
  // Fetch current server record to avoid nulling unspecified fields (backend uses Modified state)
  let current = null;
  try {
    current = await getUserById(userID);
  } catch (e) {
    // proceed without if GET fails
  }

  const base = current?.raw || current || {};
  const merged = {
    // Ensure server-required fields are present
    UserID: userID,
    Username: userData.Username ?? base.Username ?? base.username ?? "",
    PasswordHash:
      userData.PasswordHash !== undefined
        ? userData.PasswordHash
        : base.PasswordHash ?? base.passwordHash ?? "",
    Email: userData.Email ?? base.Email ?? base.email ?? "",
    FirstName: userData.FirstName ?? base.FirstName ?? base.firstName ?? "",
    LastName: userData.LastName ?? base.LastName ?? base.lastName ?? "",
    UserTypeID:
      userData.UserTypeID ??
      base.UserTypeID ??
      base.userTypeID ??
      base.userTypeId ??
      null,
    IsActive: userData.IsActive ?? base.IsActive ?? base.isActive ?? true,
    ProfilePicture:
      userData.ProfilePicture ??
      base.ProfilePicture ??
      base.profilePicture ??
      null,
    // pass through any extra fields (backend may ignore)
    ...userData,
  };

  const response = await fetch(`${API_URL}/${userID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(merged),
  });

  if (!response.ok) {
    throw new Error("Failed to update user");
  }

  // Backend returns 204 No Content on success; handle gracefully
  if (response.status === 204) {
    // Return a combined view of base and userData
    return mapUser({ ...base, ...merged });
  }

  // Some implementations may return the updated entity
  try {
    const payload = await response.json();
    return mapUser(payload) ?? payload;
  } catch {
    // Fallback
    return mapUser({ ...base, ...merged });
  }
};

export const deleteUser = async (userID) => {
  const response = await fetch(`${API_URL}/${userID}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete user");
  }
  return true;
};

export const getStudents = async () => {
  const response = await fetch(`${API_URL}/students`);
  if (!response.ok) {
    throw new Error("Failed to fetch students");
  }

  const payload = await response.json();
  return mapUsers(payload);
};
