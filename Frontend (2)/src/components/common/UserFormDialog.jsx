import { useState } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import UserForm from "../../components/users/UserForm";
const UserFormDialog = ({
  onSave,
  initialData = {},
  triggerButton,
  forceUserType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={handleOpen}>{triggerButton}</div>
      ) : (
        <Button onClick={handleOpen} variant="primary">
          {initialData.id ? "Edit User" : "Add New User"}
        </Button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={initialData.id ? "Edit User" : "Create New User"}
        size="lg"
      >
        <UserForm
          onSubmit={handleSubmit}
          initialData={initialData}
          loading={isSubmitting}
          onCancel={handleClose}
          forceUserType={forceUserType}
        />
      </Modal>
    </>
  );
};

export default UserFormDialog;
