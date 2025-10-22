import { useNavigate } from "react-router-dom";
import Modal from "../components/common/Modal";
import Profile from "./Profile";

const ProfileModal = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    // go back to previous route; if none, fallback to root
    try {
      navigate(-1);
    } catch (e) {
      navigate("/");
    }
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Profile">
      <Profile />
    </Modal>
  );
};

export default ProfileModal;
