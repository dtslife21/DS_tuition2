import ComplaintForm from "../../components/complaints/ComplaintForm";

const StudentComplaints = () => {
  const handleAdd = (payload) => {
    // TODO: Replace with real service call (e.g., complaintService.create)
    console.log("Student complaint submitted:", payload);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Complaints
      </h1>
      <ComplaintForm onAdd={handleAdd} />
    </div>
  );
};

export default StudentComplaints;
