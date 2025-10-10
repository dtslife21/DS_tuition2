 
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserById, updateUser } from '../../services/userService';
import UserForm from '../../components/users/UserForm';

const UserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUserById(id);
        setUser(data);
      } catch (err) {
        setError('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [id]);
 
  const handleSave = async (userData) => {
    try {
      const updatedUser = await updateUser(id, userData);
      setUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update user');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {user.FirstName} {user.LastName}
        </h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <UserForm
          onSubmit={handleSave}
          user={user}
          onCancel={() => setIsEditing(false)}
          userTypes={[
            { id: 1, name: 'Admin' },
            { id: 2, name: 'Teacher' },
            { id: 3, name: 'Student' }
          ]}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          {/* Display all user details here */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Email</h3>
              <p>{user.Email}</p>
            </div>
            <div>
              <h3 className="font-medium">Role</h3>
              
            </div>
            {/* Add all other user fields here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage;