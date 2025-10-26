import { useEffect } from "react";
import { useForm } from "react-hook-form";
import Button from "../common/Button";
import { getLatestSubjectId } from "../../services/subjectService";

const CourseForm = ({
  onSubmit,
  onCancel,
  loading,
  initialData = {},
  step,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: initialData,
  });

  // Auto-fill the Subject ID with the latest from backend if not provided
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (initialData && initialData.subjectId) return;
      try {
        const latest = await getLatestSubjectId();
        // If backend returns the latest existing SubjectID, show the next available id (latest + 1)
        if (!cancelled && typeof latest === "number" && !Number.isNaN(latest)) {
          const nextId = latest + 1;
          setValue("subjectId", String(nextId), { shouldValidate: true });
        }
      } catch (_) {
        // ignore; user can type manually
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [initialData, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {step ? (
        <div className="text-sm font-medium text-indigo-600">
          Step {step} of 2
        </div>
      ) : null}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Course Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          {...register("name", { required: "Course name is required" })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Course Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          {...register("code", { required: "Course code is required" })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {errors.code && (
          <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="teacherId"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Teacher ID
        </label>
        <input
          id="teacherId"
          name="teacherId"
          type="text"
          {...register("teacherId")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {errors.teacherId && (
          <p className="mt-1 text-sm text-red-600">
            {errors.teacherId.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="subjectId"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Subject ID
        </label>
        <input
          id="subjectId"
          name="subjectId"
          type="text"
          {...register("subjectId", { required: "Subject ID is required" })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          readOnly={Boolean(initialData?.subjectId)}
        />
        {initialData?.subjectId ? (
          <p className="mt-1 text-xs text-gray-500">
            Prefilled from newly created subject
          </p>
        ) : null}
        {errors.subjectId && (
          <p className="mt-1 text-sm text-red-600">
            {errors.subjectId.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="academicYear"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Academic Year
        </label>
        <input
          id="academicYear"
          name="academicYear"
          type="text"
          {...register("academicYear", {
            required: "Academic year is required",
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {errors.academicYear && (
          <p className="mt-1 text-sm text-red-600">
            {errors.academicYear.message}
          </p>
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
          name="description"
          rows={3}
          {...register("description")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving..." : "Save Course"}
        </Button>
      </div>
    </form>
  );
};

export default CourseForm;
