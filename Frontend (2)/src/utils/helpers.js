export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

export const formatTime = (timeString) => {
  const options = { hour: '2-digit', minute: '2-digit' }
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(undefined, options)
}

export const getFileType = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase()
  switch (extension) {
    case 'pdf':
      return 'PDF'
    case 'doc':
    case 'docx':
      return 'Word'
    case 'ppt':
    case 'pptx':
      return 'PowerPoint'
    case 'xls':
    case 'xlsx':
      return 'Excel'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'Image'
    case 'mp4':
    case 'mov':
    case 'avi':
      return 'Video'
    case 'mp3':
    case 'wav':
      return 'Audio'
    default:
      return 'File'
  }
}

export const truncate = (str, n) => {
  return str.length > n ? str.substr(0, n - 1) + '...' : str
}

export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}