// ??$$$
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { reviewService } from '../services/review.service';
import StudentStatsModal from '../components/admin/StudentStatsModal';
import '../styles/admin.css';

function ViewStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null); // ??$$$

  useEffect(() => {
    async function fetchStudents() {
      try {
        const data = await reviewService.getStudents();
        setStudents(data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch students.');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const handleToggleStatus = async (studentId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    const actionLabel = newStatus === 'banned' ? 'ban' : 'unban';
    
    if (!window.confirm(`Are you sure you want to ${actionLabel} this student?`)) {
      return;
    }
    
    try {
      setError('');
      await reviewService.updateStudentStatus(studentId, newStatus);
      
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId ? { ...student, status: newStatus } : student
        )
      );
    } catch (err) {
      console.error(err);
      setError(`Failed to update status for student ID ${studentId}.`);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Registered Students">
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout title="Registered Students">
      {error && <div className="error-message">{error}</div>}
      
      <div className="summary-card student-list-card">
        <h3 className="section-subtitle">
          Students List ({students.length})
        </h3>
        
        {students.length === 0 ? (
          <div className="empty-state">
            <h3>No Students Registered</h3>
            <p>Once students sign up, they will appear here.</p>
          </div>
        ) : (
          <table className="guide-table">
            <thead>
              <tr className="table-header-row">
                <th className="table-cell-padding bold-header">ID</th>
                <th className="table-cell-padding bold-header">Name</th>
                <th className="table-cell-padding bold-header">Email</th>
                <th className="table-cell-padding bold-header">Role</th>
                <th className="table-cell-padding bold-header">Status</th>
                <th className="table-cell-padding bold-header">Joined At</th>
                <th className="table-cell-padding bold-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="table-body-row">
                  <td className="table-cell-padding cell-main">{student.id}</td>
                  <td className="table-cell-padding cell-main-bold">{student.name}</td>
                  <td className="table-cell-padding cell-muted">{student.email}</td>
                  <td className="table-cell-padding">
                    <span className="tag tag-category tag-uppercase">
                      {student.role}
                    </span>
                  </td>
                  <td className="table-cell-padding">
                    <span className={`tag tag-difficulty tag-uppercase ${student.status === 'active' ? 'basic' : 'advanced'}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="table-cell-padding cell-muted">
                    {new Date(student.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="table-cell-padding">
                    <div className="flex-gap-8">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="btn btn-approve btn-small"
                      >
                        View Stats
                      </button>
                      <button
                        onClick={() => handleToggleStatus(student.id, student.status)}
                        className={`btn btn-small ${student.status === 'active' ? 'btn-danger-bg' : 'btn-success-bg'}`}
                      >
                        {student.status === 'active' ? 'Ban' : 'Unban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedStudent && (
        <StudentStatsModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </AdminLayout>
  );
}

export default ViewStudents;
