"use client";
// app/student/dashboard/page.tsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "../styles/dashboard.css";
import { Bell } from "lucide-react";
import { useNotices }  from "../context/NoticeContext";
import { useProfile }  from "../context/ProfileContext";
import { getAvatar }   from "../constants/avatars";
import api from "../../lib/api"; 

const STUDENT_ID = "BWF-2024-001";
const DEFAULT_URL = "https://www.borderlessworldfoundation.org/";

/* ── Fallbacks ── */
const MOCK_MENTOR = {
  name:"Ms. Dana", role:"Your Mentor", dateLabel:"Today",
  avatarUrl:"https://ui-avatars.com/api/?name=Dana+Elomo&background=fce7f3&color=db2777&rounded=true",
  message:"Hi Aisha! Your group presentation for the Science module was excellent yesterday. Keep up the great momentum.",
};

const INSPIRATION_QUOTES = [
  { quote: "You are braver than you believe, stronger than you seem, and smarter than you think.", footer: "Take a deep breath." },
  { quote: "Believe you can and you're halfway there.", footer: "Your mindset is your greatest asset." }
];

export default function Dashboard() {
  const router = useRouter();
  const { unreadCount } = useNotices();
  const { avatarId, name } = useProfile();
  const av = getAvatar(avatarId);
  const hasUnread = unreadCount > 0;

  /* ── State ── */
  const [schedule, setSchedule] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mentorNote, setMentorNote] = useState<any>(null);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  
  // NEW: Dynamic Resources State
  const [resources, setResources] = useState({
    library: DEFAULT_URL,
    syllabus: DEFAULT_URL,
    contactMentor: DEFAULT_URL
  });

  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome");
  const [reacted, setReacted] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const firstName = name.split(" ")[0];

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % INSPIRATION_QUOTES.length);
    }, 10000);

    const fetchDashboard = async () => {
      try {
        const res = await api.get(`/student/dashboard/${STUDENT_ID}`);
        setSchedule(res.data.schedule || []);
        setAssignments(res.data.assignments || []);
        
        // Load Mentor Note & "Thanks" state
        const note = res.data.mentorNote || null;
        setMentorNote(note);
        if (note?.thanked) setReacted(true);
        
        setTodayMood(res.data.todayMood || null);

        // NEW: Map dynamic resources from backend if they exist
        if (res.data.resources) {
          setResources({
            library: res.data.resources.library || DEFAULT_URL,
            syllabus: res.data.resources.syllabus || DEFAULT_URL,
            contactMentor: res.data.resources.contactMentor || DEFAULT_URL
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
    return () => clearInterval(interval);
  }, []);

  const handleMoodClick = async (mood: string) => {
    try {
      await api.post(`/student/dashboard/${STUDENT_ID}/mood`, { mood });
      setTodayMood(mood);
    } catch (error) {
      console.error("Failed to log mood", error);
    }
  };

  const handleThanksClick = async () => {
    if (!mentorNote?._id || reacted) return;
    try {
      setReacted(true);
      await api.post(`/student/dashboard/${STUDENT_ID}/mentor-note/${mentorNote._id}/thanks`);
    } catch (error) {
      console.error("Failed to thank mentor", error);
      setReacted(false);
    }
  };

  const openLink = (url: string) => window.open(url, "_blank");

  return (
    <main className="main-content">
      {/* HEADER */}
      <header className="top-header">
        <h1>{greeting}, {firstName} 👋</h1>
        <div className="header-actions">
          <button className={`dash-bell-btn${hasUnread ? " dash-bell-btn--alert" : ""}`} onClick={() => router.push("/student/noticeboard")}>
            <Bell size={19} />
            {hasUnread && <span className="dash-bell-badge">{unreadCount}</span>}
          </button>
          <button className="dash-avatar-btn" style={{ background: av.bg }} onClick={() => router.push("/student/profile")}>
            <span>{av.emoji}</span>
          </button>
        </div>
      </header>

      {/* WELCOME / MOOD */}
      <section className="welcome-banner">
        <div className="welcome-text">
          <h2>Welcome back!</h2>
          <p>Borderless World Foundation (BWF) created a safe space for you.</p>
        </div>
        <div className="mood-tracker">
          <button className="mood-btn" onClick={() => handleMoodClick("happy")}>
            <span className="emoji">😊</span><span className="label">{todayMood === "happy" ? "Logged!" : "Happy"}</span>
          </button>
          <button className="mood-btn" onClick={() => handleMoodClick("okay")}>
            <span className="emoji">😐</span><span className="label">{todayMood === "okay" ? "Logged!" : "Okay"}</span>
          </button>
          <button className="mood-btn help-btn" onClick={() => handleMoodClick("need_help")}>
            <span className="emoji">😨</span><span className="label">{todayMood === "need_help" ? "Logged!" : "Need Help"}</span>
          </button>
        </div>
      </section>

      {/* GRID */}
      <section className="dashboard-grid">
        <div className="card schedule-card">
          <h3>Today's Schedule</h3>
          <div className="schedule-list">
            {isLoading ? <p>Loading...</p> : schedule.map(s => (
              <div key={s._id} className="schedule-item">
                <div className="time">{s.startTime}</div>
                <div className="details">
                  <h4>{s.title}</h4>
                  <button className="btn-primary" onClick={() => s.joinLink && openLink(s.joinLink)}>
                    {s.joinLink ? "Join session" : "View details"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ASSIGNMENTS */}
        <div className="card assignments-card">
          <h3>Recent Assignments</h3>
          <div className="assignment-list">
             {assignments.length > 0 ? assignments.map(a => (
              <div key={a._id} className="assignment-item">
                <div className="assignment-header">
                  <span className={`status-dot dot-${a.priority || 'medium'}`} />
                  <h4>{a.title}</h4>
                </div>
                <span className="due-date">Due: {a.dueDate}</span>
              </div>
            )) : <p className="text-sm text-gray-400 mt-2">All caught up!</p>}
          </div>
        </div>

        {/* DYNAMIC RESOURCES */}
        <div className="card resources-card">
          <h3>Quick Resources</h3>
          <div className="resource-buttons">
            <button className="resource-btn bg-library" onClick={() => openLink(resources.library)}>📚 Library</button>
            <button className="resource-btn bg-syllabus" onClick={() => openLink(resources.syllabus)}>📄 Download Syllabus</button>
            <button className="resource-btn bg-mentor" onClick={() => openLink(resources.contactMentor)}>💬 Contact Mentor</button>
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION */}
      <section className="connection-section mt-8">
        <div className="card mentor-note-card">
          <div className="card-header">
            <div className="mentor-info">
              <div className="mentor-avatar">
                <img src={MOCK_MENTOR.avatarUrl} alt="Mentor" />
              </div>
              <div>
                <h3>Note from {mentorNote?.mentorName || MOCK_MENTOR.name}</h3>
                <span className="mentor-role-label">{MOCK_MENTOR.role}</span>
              </div>
            </div>
          </div>
          <div className="mentor-message">
            <p>"{mentorNote?.message || MOCK_MENTOR.message}"</p>
          </div>
          <div className="mentor-actions">
            <button className={`btn-react${reacted ? " btn-react--active" : ""}`} onClick={handleThanksClick} disabled={reacted}>
              {reacted ? "❤️" : "🤍"}
            </button>
            <button className="btn-reply" onClick={handleThanksClick}>{reacted ? "Thanked!" : "Say thanks"}</button>
          </div>
        </div>

        <div className="card mindful-card">
          <div className="mindful-header"><h3>Daily Inspiration</h3></div>
          <div className="mindful-body"><p>"{INSPIRATION_QUOTES[quoteIndex].quote}"</p></div>
          <div className="mindful-footer"><p>{INSPIRATION_QUOTES[quoteIndex].footer}</p></div>
        </div>
      </section>
    </main>
  );
}