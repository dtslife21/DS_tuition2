export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@school.edu',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    userType: 'admin',
    profilePicture: null,
  },
  {
    id: 2,
    username: 'teacher1',
    email: 'teacher1@school.edu',
    password: 'teacher123',
    firstName: 'John',
    lastName: 'Smith',
    userType: 'teacher',
    profilePicture: null,
    employeeID: 'T001',
    department: 'Computer Science',
    qualification: 'PhD in Computer Science',
  },
  {
    id: 3,
    username: 'student1',
    email: 'student1@school.edu',
    password: 'student123',
    firstName: 'Alice',
    lastName: 'Johnson',
    userType: 'student',
    profilePicture: null,
    rollNumber: 'S001',
    currentGrade: 'A',
  },
]
export const mockStudents = [
  {
    id: 3,
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'student1@school.edu',
    rollNumber: 'S001',
    enrollmentDate: '2023-09-01',
    currentGrade: 'A',
  },
  {
    id: 4,
    firstName: 'Bob',
    lastName: 'Williams',
    email: 'student2@school.edu',
    rollNumber: 'S002',
    enrollmentDate: '2023-09-01',
    currentGrade: 'B+',
  },
]

export const mockCourses = [
  {
    id: 1,
    name: 'Introduction to Programming',
    code: 'CS101',
    subject: 'Computer Science',
    teacherId: 2,
    description: 'Basic programming concepts using Python',
    academicYear: '2023-2024',
  },
  {
    id: 2,
    name: 'Web Development',
    code: 'CS201',
    subject: 'Computer Science',
    teacherId: 2,
    description: 'Frontend and backend web development',
    academicYear: '2023-2024',
  },
]

export const mockMaterials = [
  {
    id: 1,
    courseId: 1,
    teacherId: 2,
    title: 'Python Basics',
    description: 'Introduction to Python programming language',
    filePath: '/materials/python-basics.pdf',
    fileType: 'pdf',
    uploadDate: '2023-09-10T10:30:00Z',
  },
  {
    id: 2,
    courseId: 1,
    teacherId: 2,
    title: 'Variables and Data Types',
    description: 'Understanding variables and data types in Python',
    filePath: '/materials/python-variables.pdf',
    fileType: 'pdf',
    uploadDate: '2023-09-15T11:45:00Z',
  },
]



export const mockAttendance = [
  {
    id: 1,
    courseId: 1,
    studentId: 3,
    date: '2023-09-10',
    status: 'Present',
  },
  {
    id: 2,
    courseId: 2,
    studentId: 4,
    date: '2023-09-10',
    status: 'Absent',
  },
]

export const mockAnnouncements = [
  {
    id: 1,
    courseId: 1,
    teacherId: 2,
    title: 'Midterm Exam Schedule',
    content: 'The midterm exam will be held on October 15th at 10:00 AM in Room 101.',
    postDate: '2023-09-20T09:00:00Z',
  },
  {
    id: 2,
    courseId: 1,
    teacherId: 2,
    title: 'Assignment Submission',
    content: 'Please submit your assignment by Friday, September 22nd.',
    postDate: '2023-09-18T14:30:00Z',
  },
]