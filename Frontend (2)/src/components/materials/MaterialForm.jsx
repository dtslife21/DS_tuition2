import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../common/Button";
import { useState } from "react";

const MaterialForm = ({ courseId, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (data) => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("file", file);
      formData.append("courseId", courseId);
      formData.append("teacherId", user.id);

      // Simulate upload
      const newMaterial = {
        id: Math.random().toString(36).substring(7),
        title: data.title,
        description: data.description,
        fileType: file.type,
        fileName: file.name,
        filePath: URL.createObjectURL(file),
        uploadDate: new Date().toISOString(),
        courseId,
        teacherId: user.id,
      };

      setIsLoading(false);
      onSuccess(newMaterial);
      reset({ title: "", description: "" });
      setFile(null);
    } catch (err) {
      setError("Failed to upload material. Please try again.");
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCancel = () => {
    reset({ title: "", description: "" });
    setFile(null);
    setError("");
    if (typeof onCancel === "function") {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Title
        </label>
        <input
          id="title"
          type="text"
          {...register("title", { required: "Title is required" })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          {...register("description")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          File
        </label>
        <input
          id="file"
          type="file"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100
            dark:file:bg-indigo-900 dark:file:text-indigo-100
            dark:hover:file:bg-indigo-800"
        />
        {error && !file && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      {file && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Selected file: <span className="font-medium">{file.name}</span> (
            {Math.round(file.size / 1024)} KB)
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          onClick={handleCancel}
          variant="secondary"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? "Uploading..." : "Upload Material"}
        </Button>
      </div>
    </form>
  );
};

export default MaterialForm;
