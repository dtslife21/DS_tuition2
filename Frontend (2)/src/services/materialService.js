import { mockMaterials } from '../utils/mockData'

export const getCourseMaterials = async (courseId) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockMaterials.filter(material => material.courseId === courseId)
}

export const getRecentMaterials = async (teacherId) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockMaterials.filter(material => material.teacherId === teacherId)
    .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
    .slice(0, 5)
}

export const uploadMaterial = async (materialData) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  const newMaterial = {
    id: Math.max(...mockMaterials.map(m => m.id)) + 1,
    ...materialData,
    uploadDate: new Date().toISOString()
  }
  mockMaterials.push(newMaterial)
  return newMaterial
}
// Real service functions (to be implemented)
/*
export const getCourseMaterials = async (courseId) => {
  const response = await axios.get(`/api/materials/course/${courseId}`)
  return response.data
}
*/