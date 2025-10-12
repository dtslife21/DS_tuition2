import { mockComplaints } from "../utils/mockData";

export const getCourseComplaints = async (courseId) => {
  await new Promise((r) => setTimeout(r, 300));
  return mockComplaints.filter((c) => String(c.courseId) === String(courseId));
};

export const createComplaint = async (data) => {
  await new Promise((r) => setTimeout(r, 300));
  const nextId = mockComplaints.length
    ? Math.max(...mockComplaints.map((c) => c.id)) + 1
    : 1;
  const newItem = { id: nextId, ...data };
  mockComplaints.push(newItem);
  return newItem;
};

export const updateComplaint = async (id, patch) => {
  await new Promise((r) => setTimeout(r, 300));
  const idx = mockComplaints.findIndex((c) => c.id === id);
  if (idx >= 0) {
    mockComplaints[idx] = { ...mockComplaints[idx], ...patch };
    return mockComplaints[idx];
  }
  throw new Error("Complaint not found");
};

export const deleteComplaint = async (id) => {
  await new Promise((r) => setTimeout(r, 300));
  const idx = mockComplaints.findIndex((c) => c.id === id);
  if (idx >= 0) {
    const [removed] = mockComplaints.splice(idx, 1);
    return removed;
  }
  throw new Error("Complaint not found");
};
