// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { Heart, User, CalendarDays, CheckCircle, XCircle, Camera, Mail, Bell, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';

// Create a query client instance for React Query
const queryClient = new QueryClient();

// --- API Service (for React Query) ---
const API_BASE_URL = 'http://localhost:3001/api';

const fetchUserRole = async () => {
  const response = await fetch(`${API_BASE_URL}/user/role`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const updateUserRole = async (role) => {
  const response = await fetch(`${API_BASE_URL}/user/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const fetchPatientDashboard = async () => {
  const response = await fetch(`${API_BASE_URL}/patient/dashboard`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const markMedicationTaken = async (medicationId) => {
  const response = await fetch(`${API_BASE_URL}/patient/mark-taken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicationId }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const fetchCaretakerDashboard = async () => {
  const response = await fetch(`${API_BASE_URL}/caretaker/dashboard`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

// --- Context for Role Management ---
const RoleContext = createContext(null);

const RoleProvider = ({ children }) => {
  const [role, setRole] = useState(null); // 'patient', 'caretaker', or null initially
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['userRole'],
    queryFn: fetchUserRole,
    staleTime: Infinity, // Role doesn't change often
  });

  const updateRoleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: (data) => {
      setRole(data.newRole);
      queryClient.invalidateQueries(['userRole']); // Invalidate to ensure consistency
    },
    onError: (err) => {
      console.error('Failed to update role:', err);
      // Using custom modal instead of alert
      // alert('Failed to update role. Please try again.');
    },
  });

  useEffect(() => {
    if (data) {
      setRole(data.role);
    }
  }, [data]);

  const toggleRole = () => {
    const newRole = role === 'patient' ? 'caretaker' : 'patient';
    updateRoleMutation.mutate(newRole);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <ActivityIndicator size="large" color="#4CAF50" />
        <p className="loading-text">Loading role...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="error-screen">
        <p>Error loading role: {error.message}</p>
      </div>
    );
  }

  return (
    <RoleContext.Provider value={{ role, setRole: updateRoleMutation.mutate, toggleRole }}>
      {children}
    </RoleContext.Provider>
  );
};

// --- Components ---

// Shared Activity Indicator
const ActivityIndicator = ({ size = 'large', color = '#4CAF50' }) => (
  <svg
    className="animate-spin"
    width={size === 'large' ? '32' : '24'}
    height={size === 'large' ? '32' : '24'}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2v4"></path>
    <path d="m16.2 7.8 2.8-2.8"></path>
    <path d="M22 12h-4"></path>
    <path d="m18.2 16.2 2.8 2.8"></path>
    <path d="M12 22v-4"></path>
    <path d="m7.8 18.2-2.8 2.8"></path>
    <path d="M2 12h4"></path>
    <path d="m5.8 7.8-2.8-2.8"></path>
  </svg>
);


const Header = () => {
  const { role, toggleRole } = useContext(RoleContext);
  const displayRole = role === 'patient' ? 'Patient View' : 'Caretaker View';
  const switchText = role === 'patient' ? 'Switch to Caretaker' : 'Switch to Patient';

  return (
    <div className="header-container">
      <div className="flex items-center">
        <span className="header-logo-m">M</span>
        <span className="header-title">MediCare Companion</span>
      </div>
      <div className="header-role-switcher">
        <span className="header-role-text">{displayRole}</span>
        <button
          onClick={toggleRole}
          className="header-switch-button"
        >
          {switchText}
        </button>
      </div>
    </div>
  );
};

const WelcomeScreen = () => {
  const { setRole } = useContext(RoleContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole, {
      onSuccess: () => {
        setModalMessage(`You have selected: ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}. Redirecting...`);
        setModalVisible(true);
        // The RoleProvider's useEffect will handle the actual role update.
        // In a real app, you might navigate here after successful backend update.
      },
      onError: () => {
        setModalMessage('Failed to set role. Please try again.');
        setModalVisible(true);
      }
    });
  };

  return (
    <div className="welcome-screen-container">
      <div className="welcome-logo-section">
        <div className="welcome-logo-bg">
          <Heart className="welcome-logo-icon" />
        </div>
        <h1 className="welcome-title">Welcome to MediCare Companion</h1>
        <p className="welcome-subtitle">
          Your trusted partner in medication management. Choose your role to get started with personalized features.
        </p>
      </div>

      <div className="welcome-card-wrapper">
        {/* Patient Card */}
        <div className="welcome-card">
          <div className="welcome-card-header">
            <User className="welcome-card-icon" style={{ color: '#3b82f6' }} /> {/* text-blue-500 */}
            <h2 className="welcome-card-title">I'm a Patient</h2>
          </div>
          <ul className="welcome-card-list">
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Track your medication schedule and maintain your health records</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Mark medications as taken</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Upload proof photos (optional)</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> View your medication calendar</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Large, easy-to-use interface</li>
          </ul>
          <button
            onClick={() => handleRoleSelect('patient')}
            className="welcome-button patient"
          >
            Continue as Patient
          </button>
        </div>

        {/* Caretaker Card */}
        <div className="welcome-card">
          <div className="welcome-card-header">
            <User className="welcome-card-icon" style={{ color: '#22c55e' }} /> {/* text-green-500 */}
            <h2 className="welcome-card-title">I'm a Caretaker</h2>
          </div>
          <ul className="welcome-card-list">
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Monitor and support your loved one's medication adherence</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Monitor medication compliance</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Set up notification preferences</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> View detailed reports</li>
            <li className="welcome-card-list-item"><CheckCircle className="welcome-card-list-icon" /> Receive email alerts</li>
          </ul>
          <button
            onClick={() => handleRoleSelect('caretaker')}
            className="welcome-button caretaker"
          >
            Continue as Caretaker
          </button>
        </div>
      </div>

      <p className="welcome-footer-text">
        You can switch between roles anytime after setup
      </p>

      {/* Custom Modal */}
      <Modal
        isOpen={modalVisible}
        onClose={() => setModalVisible(false)}
        message={modalMessage}
      />
    </div>
  );
};


const PatientDashboard = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['patientDashboard'],
    queryFn: fetchPatientDashboard,
  });

  const markTakenMutation = useMutation({
    mutationFn: markMedicationTaken,
    onSuccess: () => {
      queryClient.invalidateQueries(['patientDashboard']); // Refetch data after success
      // alert('Medication marked as taken!'); // Using custom modal
    },
    onError: (err) => {
      console.error('Failed to mark medication taken:', err);
      // alert('Failed to mark medication. Please try again.'); // Using custom modal
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <ActivityIndicator size="large" color="#4CAF50" />
        <p className="loading-text">Loading patient dashboard...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="error-screen">
        <p>Error: {error.message}</p>
      </div>
    );
  }

  const { dailyMedications, monthlyRate, dayStreak, todayStatus, calendarData } = data;

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
        {/* Welcome Section */}
        <div className="patient-welcome-section">
          <h2 className="patient-welcome-title">Good Morning!</h2>
          <p className="patient-welcome-subtitle">Ready to stay on track with your medication?</p>
          <div className="patient-stats-grid">
            <div className="patient-stat-item">
              <span className="patient-stat-value blue">{dayStreak}</span>
              <span className="patient-stat-label">Day Streak</span>
            </div>
            <div className="patient-stat-item">
              <span className="patient-stat-value green">{todayStatus}</span>
              <span className="patient-stat-label">Today's Status</span>
            </div>
            <div className="patient-stat-item">
              <span className="patient-stat-value purple">{monthlyRate}</span>
              <span className="patient-stat-label">Monthly Rate</span>
            </div>
          </div>
        </div>

        {/* Today's Medication */}
        <div className="section-card">
          <h3 className="section-title">Today's Medication</h3>
          {dailyMedications.length === 0 ? (
            <p className="text-gray-500">No medications scheduled for today.</p>
          ) : (
            dailyMedications.map((med) => (
              <div key={med.id} className="medication-item">
                <div className="medication-info">
                  <span className={`medication-status-circle ${med.status}`}>
                    1 {/* Assuming only one item per list for simplicity */}
                  </span>
                  <div>
                    <p className="medication-name">{med.name}</p>
                    <p className="medication-description">{med.status === 'pending' ? 'Complete set of daily tablets' : med.status}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="medication-time">{med.time}</span>
                  {med.status === 'pending' && (
                    <button
                      onClick={() => markTakenMutation.mutate(med.id)}
                      disabled={markTakenMutation.isLoading}
                      className="mark-taken-button"
                    >
                      {markTakenMutation.isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <CheckCircle className="mark-taken-button-icon" /> Mark as Taken
                        </>
                      )}
                    </button>
                  )}
                  {med.status === 'taken' && (
                    <span className="status-label taken">Taken</span>
                  )}
                  {med.status === 'missed' && (
                    <span className="status-label missed">Missed</span>
                  )}
                </div>
              </div>
            ))
          )}

          <div className="proof-photo-section">
            <p className="proof-photo-title">Add Proof Photo (Optional)</p>
            <p className="proof-photo-subtitle">Take a photo of your medication or pill organizer as confirmation</p>
            <button className="take-photo-button">
              <Camera className="take-photo-button-icon" /> Take Photo
            </button>
          </div>
        </div>

        {/* Medication Calendar */}
        <div className="section-card">
          <h3 className="section-title">Medication Calendar</h3>
          <CalendarComponent calendarData={calendarData} />
        </div>
      </div>
    </div>
  );
};


const CalendarComponent = ({ calendarData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getMonthName = (date) => date.toLocaleString('default', { month: 'long' });
  const getYear = (date) => date.getFullYear();

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 for Sunday

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const numDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month); // Day of week for 1st of month

    const days = [];
    // Empty cells for the days before the 1st
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day-cell"></div>);
    }

    for (let i = 1; i <= numDays; i++) {
      const dayDate = new Date(year, month, i);
      const formattedDateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      const status = calendarData[formattedDateKey];
      const isToday = dayDate.toDateString() === new Date().toDateString();

      let dotClass = '';
      if (status === 'taken') {
        dotClass = 'taken';
      } else if (status === 'missed') {
        dotClass = 'missed';
      }

      days.push(
        <div
          key={i}
          className={`calendar-day-cell ${isToday ? 'today' : ''}`}
        >
          <span className={`calendar-day-number ${isToday ? 'today' : ''}`}>{i}</span>
          {dotClass && (
            <span className={`calendar-dot ${dotClass}`}></span>
          )}
        </div>
      );
    }
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="calendar-nav-button">
          <ChevronLeft className="calendar-nav-icon" />
        </button>
        <span className="calendar-month-year">
          {getMonthName(currentDate)} {getYear(currentDate)}
        </span>
        <button onClick={goToNextMonth} className="calendar-nav-button">
          <ChevronRight className="calendar-nav-icon" />
        </button>
      </div>
      <div className="calendar-weekdays">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>
      <div className="calendar-days-grid">
        {renderDays()}
      </div>
      <div className="calendar-legend">
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot green"></span>
          <span className="calendar-legend-text">Medication taken</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot red"></span>
          <span className="calendar-legend-text">Missed medication</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot blue-border"></span>
          <span className="calendar-legend-text">Today</span>
        </div>
      </div>
    </div>
  );
};


const CaretakerDashboard = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['caretakerDashboard'],
    queryFn: fetchCaretakerDashboard,
  });

  const [activeTab, setActiveTab] = useState('Overview');

  if (isLoading) {
    return (
      <div className="loading-screen">
        <ActivityIndicator size="large" color="#4CAF50" />
        <p className="loading-text">Loading caretaker dashboard...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="error-screen">
        <p>Error: {error.message}</p>
      </div>
    );
  }

  const {
    adherenceRate,
    currentStreak,
    missedThisMonth,
    takenThisWeek,
    todayStatus,
    monthlyAdherenceProgress,
  } = data;

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
        <h1 className="caretaker-dashboard-title">Caretaker Dashboard</h1>
        <p className="caretaker-dashboard-subtitle">Monitoring Eleanor Thompson's medication adherence</p>

        {/* Top Stats */}
        <div className="caretaker-stats-grid">
          <StatCard title="Adherence Rate" value={`${adherenceRate}%`} color="green" bgColor="bg-green-100" />
          <StatCard title="Current Streak" value={currentStreak} color="blue" bgColor="bg-blue-100" />
          <StatCard title="Missed This Month" value={missedThisMonth} color="red" bgColor="bg-red-100" />
          <StatCard title="Taken This Week" value={takenThisWeek} color="purple" bgColor="bg-purple-100" />
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          {['Overview', 'Recent Activity', 'Calendar View', 'Notifications'].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <div className="section-card">
            <h3 className="section-title">Today's Status</h3>
            {todayStatus.length === 0 ? (
              <p className="text-gray-500">No medications scheduled for today.</p>
            ) : (
              todayStatus.map((med) => (
                <div key={med.id} className="caretaker-status-item">
                  <div className="caretaker-status-info">
                    <p className="caretaker-med-name">{med.name}</p>
                    <p className="caretaker-med-time">({med.time})</p>
                  </div>
                  <span className={`caretaker-status-badge ${med.status}`}>
                    {med.status.charAt(0).toUpperCase() + med.status.slice(1)}
                  </span>
                </div>
              ))
            )}

            <h3 className="section-title quick-actions-section">Quick Actions</h3>
            <div className="quick-actions-list">
              <QuickActionButton icon={<Mail className="w-5 h-5" style={{ color: '#2563eb' }} />} text="Send Reminder Email" />
              <QuickActionButton icon={<Bell className="w-5 h-5" style={{ color: '#9333ea' }} />} text="Configure Notifications" />
              <QuickActionButton icon={<CalendarDays className="w-5 h-5" style={{ color: '#16a34a' }} />} text="View Full Calendar" />
            </div>

            <h3 className="section-title quick-actions-section">Monthly Adherence Progress</h3>
            <p className="text-gray-600 mb-3">Overall Progress: <span className="font-bold">{monthlyAdherenceProgress.overall}%</span></p>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${monthlyAdherenceProgress.overall}%` }}
              ></div>
            </div>
            <div className="progress-stats">
              <span>{monthlyAdherenceProgress.takenDays} days Taken</span>
              <span>{monthlyAdherenceProgress.missedDays} days Missed</span>
              <span>{monthlyAdherenceProgress.remainingDays} days Remaining</span>
            </div>
          </div>
        )}
        {/* Placeholder for other tabs */}
        {activeTab !== 'Overview' && (
          <div className="section-card">
            <p className="text-gray-500">Content for {activeTab} will go here.</p>
          </div>
        )}
      </div>
    </div>
  );
};


const StatCard = ({ title, value, color, bgColor }) => (
  <div className={`stat-card ${bgColor}`}>
    <p className="stat-card-title">{title}</p>
    <span className={`stat-card-value ${color}`}>{value}</span>
  </div>
);

const QuickActionButton = ({ icon, text }) => (
  <button className="quick-action-button">
    <span className="quick-action-button-icon">{icon}</span>
    <span className="quick-action-button-text">{text}</span>
  </button>
);


// Custom Modal Component (Replaces alert() and window.confirm())
const Modal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p className="modal-message">{message}</p>
        <button
          onClick={onClose}
          className="modal-button"
        >
          OK
        </button>
      </div>
    </div>
  );
};


// --- Main App Component ---
export default function App() {
  return (
    <div className="app-container">
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <AppContent />
        </RoleProvider>
      </QueryClientProvider>
    </div>
  );
}

// Separate component to consume context and render based on role
const AppContent = () => {
  const { role } = useContext(RoleContext);

  if (!role) {
    return <WelcomeScreen />;
  }

  return (
    <>
      {role === 'patient' && <PatientDashboard />}
      {role === 'caretaker' && <CaretakerDashboard />}
    </>
  );
};
