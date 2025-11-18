export const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy} / ${mm} / ${dd}`;
};

export const formatTime = (timeString) => {
  const options = { hour: "2-digit", minute: "2-digit" };
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(
    undefined,
    options
  );
};

export const getFileType = (fileName) => {
  const extension = fileName.split(".").pop().toLowerCase();
  switch (extension) {
    case "pdf":
      return "PDF";
    case "doc":
    case "docx":
      return "Word";
    case "ppt":
    case "pptx":
      return "PowerPoint";
    case "xls":
    case "xlsx":
      return "Excel";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return "Image";
    case "mp4":
    case "mov":
    case "avi":
      return "Video";
    case "mp3":
    case "wav":
      return "Audio";
    default:
      return "File";
  }
};

export const truncate = (str, n) => {
  return str.length > n ? str.substr(0, n - 1) + "..." : str;
};

export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const collectCourseIdsForStudent = (courses, fallbackCourseId) => {
  const ids = new Set();

  const addId = (value) => {
    if (value === undefined || value === null) {
      return;
    }

    const text = String(value).trim();
    if (!text) {
      return;
    }

    ids.add(text);
  };

  if (Array.isArray(courses)) {
    courses.forEach((course) => {
      if (!course || typeof course !== "object") {
        return;
      }

      const candidates = [
        course.id,
        course.courseId,
        course.courseID,
        course.CourseId,
        course.CourseID,
        course.Course?.id,
        course.Course?.courseId,
        course.Course?.courseID,
        course.Course?.CourseId,
        course.Course?.CourseID,
      ];

      candidates.forEach(addId);
    });
  }

  if (fallbackCourseId !== undefined && fallbackCourseId !== null) {
    addId(fallbackCourseId);
  }

  return Array.from(ids);
};
