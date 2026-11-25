import { useState } from 'react';
import {
  Menu,
  Plus,
  Grip,
  Home,
  Calendar,
  CheckSquare,
  FolderOpen,
  Settings,
  MoreVertical,
  BookOpen,
  FileText,
  Users,
  Send,
  ArrowLeft,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface ClassroomCoverProps {
  onExit: () => void;
}

interface AssignmentItem {
  id: string;
  title: string;
  topic: string;
  due: string;
  points: number;
  done: boolean;
  instructions: string;
}

interface CourseItem {
  id: string;
  name: string;
  section: string;
  teacher: string;
  bannerBg: string;
  avatarBg: string;
  upcomingTitle: string;
  upcomingDue: string;
  announcements: Array<{ id: string; author: string; date: string; text: string }>;
  assignments: AssignmentItem[];
  classmates: string[];
}

const INITIAL_COURSES: CourseItem[] = [
  {
    id: 'cs',
    name: 'AP Computer Science A',
    section: 'Period 3 · Room 214',
    teacher: 'Mr. Harrison',
    bannerBg: 'from-[#1967d2] to-[#174ea6]',
    avatarBg: 'bg-[#1a73e8]',
    upcomingTitle: 'Lab 4: ArrayList & Recursion',
    upcomingDue: 'Tomorrow, 11:59 PM',
    announcements: [
      {
        id: 'cs-a1',
        author: 'Mr. Harrison',
        date: 'Yesterday',
        text: 'Reminder: Check edge cases for empty lists in recursive search before submitting Lab 4. Office hours are open after 6th period.',
      },
      {
        id: 'cs-a2',
        author: 'Mr. Harrison',
        date: 'Nov 19',
        text: 'Unit 4 practice FRQs and scoring guidelines have been posted under Classwork.',
      },
    ],
    assignments: [
      {
        id: 'cs-1',
        title: 'Lab 4: ArrayList & Recursion',
        topic: 'Unit 5 · Recursion',
        due: 'Due Tomorrow',
        points: 40,
        done: false,
        instructions:
          'Implement binarySearchRecursive and mergeSortedLists in Main.java. Include at least 4 JUnit test cases.',
      },
      {
        id: 'cs-2',
        title: 'FRQ Practice #3 (2D Arrays)',
        topic: 'AP Exam Prep',
        due: 'Due Nov 27',
        points: 25,
        done: false,
        instructions: 'Complete parts (a) and (b) on paper or Docs and upload PDF.',
      },
      {
        id: 'cs-3',
        title: 'Inheritance & Polymorphism Quiz Review',
        topic: 'Unit 4 · OOP',
        due: 'Turned in',
        points: 20,
        done: true,
        instructions: 'Review worksheet covering super constructors and method overriding.',
      },
    ],
    classmates: ['Maya Lin', 'Devon Brooks', 'Sofia Martinez', 'Liam Patel', 'Noah Kim', 'Emma Davis'],
  },
  {
    id: 'math',
    name: 'Algebra II & Trigonometry',
    section: 'Period 2 · Room 108',
    teacher: 'Ms. Alvarez',
    bannerBg: 'from-[#0d652d] to-[#137333]',
    avatarBg: 'bg-[#1e8e3e]',
    upcomingTitle: 'Unit 5 Problem Set: Polynomials',
    upcomingDue: 'Friday, 8:00 AM',
    announcements: [
      {
        id: 'math-a1',
        author: 'Ms. Alvarez',
        date: '2 days ago',
        text: 'Graphing calculators are allowed on Friday’s quiz. Show all synthetic division steps clearly on page 2.',
      },
    ],
    assignments: [
      {
        id: 'math-1',
        title: 'Unit 5 Problem Set: Polynomial Roots',
        topic: 'Polynomial Functions',
        due: 'Due Friday',
        points: 30,
        done: false,
        instructions: 'Complete problems #1–18 odd from Section 5.4 and verify zeros graphically.',
      },
      {
        id: 'math-2',
        title: 'Complex Numbers Check-In',
        topic: 'Review',
        due: 'Turned in',
        points: 15,
        done: true,
        instructions: 'Simplify expressions in a + bi form.',
      },
    ],
    classmates: ['Chloe Nguyen', 'Ethan Ross', 'Zara Ali', 'Lucas Bennett'],
  },
  {
    id: 'history',
    name: 'World History: Modern Era',
    section: 'Period 4 · Room 302',
    teacher: 'Dr. Patel',
    bannerBg: 'from-[#b06000] to-[#e37400]',
    avatarBg: 'bg-[#ea8600]',
    upcomingTitle: 'Primary Source DBQ Outline',
    upcomingDue: 'Nov 26, 3:00 PM',
    announcements: [
      {
        id: 'hist-a1',
        author: 'Dr. Patel',
        date: 'Nov 20',
        text: 'For the DBQ outline, make sure you cite at least 4 of the 7 documents and include historical context in your thesis.',
      },
    ],
    assignments: [
      {
        id: 'hist-1',
        title: 'Industrial Revolution DBQ Outline',
        topic: 'Unit 4 · Industrialization',
        due: 'Due Nov 26',
        points: 50,
        done: false,
        instructions: 'Submit thesis statement and 3 body paragraph topic claims with document citations.',
      },
    ],
    classmates: ['Ava Thompson', 'Marcus Green', 'Elena Rossi', 'Owen Park'],
  },
  {
    id: 'chem',
    name: 'Chemistry Honors',
    section: 'Period 6 · Lab 115',
    teacher: 'Mrs. Chen',
    bannerBg: 'from-[#8430ce] to-[#681da8]',
    avatarBg: 'bg-[#9334e6]',
    upcomingTitle: 'Stoichiometry Titration Lab',
    upcomingDue: 'Monday, 11:59 PM',
    announcements: [
      {
        id: 'chem-a1',
        author: 'Mrs. Chen',
        date: 'Today',
        text: 'Lab goggles required tomorrow. Upload your pre-lab molarity calculations before class starts.',
      },
    ],
    assignments: [
      {
        id: 'chem-1',
        title: 'Titration Pre-Lab Calculations',
        topic: 'Stoichiometry',
        due: 'Due Monday',
        points: 25,
        done: false,
        instructions: 'Calculate theoretical equivalence volume for 0.15 M NaOH titrated with 25 mL HCl.',
      },
    ],
    classmates: ['Hannah Cho', 'Julian Ortiz', 'Grace Lee', 'Samir Shah'],
  },
  {
    id: 'english',
    name: 'English Literature 11',
    section: 'Period 1 · Room 204',
    teacher: 'Mr. Brooks',
    bannerBg: 'from-[#c5221f] to-[#a50e0e]',
    avatarBg: 'bg-[#d93025]',
    upcomingTitle: 'Rhetorical Analysis Draft',
    upcomingDue: 'Wednesday, 11:59 PM',
    announcements: [
      {
        id: 'eng-a1',
        author: 'Mr. Brooks',
        date: 'Nov 21',
        text: 'Peer review groups are posted. Bring two printed or digital copies of your introduction paragraph.',
      },
    ],
    assignments: [
      {
        id: 'eng-1',
        title: 'Rhetorical Analysis Essay Draft',
        topic: 'Argument & Rhetoric',
        due: 'Due Wednesday',
        points: 100,
        done: false,
        instructions: '750–900 words analyzing ethos, pathos, and syntax shifts in the assigned speech.',
      },
    ],
    classmates: ['Nora Adams', 'Caleb Wright', 'Isla Foster', 'Ryan Diaz'],
  },
  {
    id: 'physics',
    name: 'Physics Mechanics',
    section: 'Period 5 · Lab 120',
    teacher: 'Dr. Okafor',
    bannerBg: 'from-[#007b83] to-[#00575e]',
    avatarBg: 'bg-[#00838f]',
    upcomingTitle: 'Projectile Motion Data Table',
    upcomingDue: 'Dec 1, 5:00 PM',
    announcements: [
      {
        id: 'phys-a1',
        author: 'Dr. Okafor',
        date: 'Nov 18',
        text: 'Remember to convert launch angles to radians if calculating range in spreadsheets.',
      },
    ],
    assignments: [
      {
        id: 'phys-1',
        title: 'Projectile Motion Lab Report',
        topic: '2D Kinematics',
        due: 'Due Dec 1',
        points: 45,
        done: false,
        instructions: 'Compare experimental horizontal displacement against theoretical range equations.',
      },
    ],
    classmates: ['Leo Carter', 'Mia Zhang', 'Ben Morales', 'Tara Singh'],
  },
];

type NavView = 'home' | 'calendar' | 'todo';
type CourseTab = 'stream' | 'classwork' | 'people';

export function ClassroomCover({ onExit }: ClassroomCoverProps) {
  const [courses, setCourses] = useState<CourseItem[]>(INITIAL_COURSES);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [navView, setNavView] = useState<NavView>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseTab, setCourseTab] = useState<CourseTab>('stream');
  const [commentInput, setCommentInput] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  const allTodoAssignments = courses.flatMap((course) =>
    course.assignments.map((a) => ({ ...a, courseName: course.name, courseId: course.id }))
  );

  const toggleAssignmentDone = (courseId: string, assignmentId: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id !== courseId
          ? c
          : {
              ...c,
              assignments: c.assignments.map((a) =>
                a.id === assignmentId ? { ...a, done: !a.done } : a
              ),
            }
      )
    );
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !commentInput.trim()) return;
    const text = commentInput.trim();
    setCourses((prev) =>
      prev.map((c) =>
        c.id !== selectedCourse.id
          ? c
          : {
              ...c,
              announcements: [
                {
                  id: `post-${Date.now()}`,
                  author: 'You',
                  date: 'Just now',
                  text,
                },
                ...c.announcements,
              ],
            }
      )
    );
    setCommentInput('');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white text-[#3c4043] flex flex-col font-sans select-text">
      {/* Google Classroom Top Bar */}
      <header className="h-16 px-4 border-b border-[#dadce0] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2.5 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors"
            aria-label="Main menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setSelectedCourseId(null);
              setNavView('home');
            }}
            className="flex items-center gap-2.5 text-left min-w-0"
          >
            <div className="w-8 h-7 rounded bg-[#1e8e3e] flex items-center justify-center relative shrink-0 border-2 border-[#fbbc04]">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-[20px] font-normal text-[#5f6368] tracking-tight truncate">
              {selectedCourse ? selectedCourse.name : 'Classroom'}
            </span>
          </button>
        </div>

        {selectedCourse && (
          <div className="hidden md:flex items-center h-full gap-1">
            {(['stream', 'classwork', 'people'] as CourseTab[]).map((tab) => {
              const active = courseTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setCourseTab(tab)}
                  className={`h-full px-5 text-sm font-medium capitalize border-b-[3px] transition-colors ${
                    active
                      ? 'border-[#1967d2] text-[#1967d2]'
                      : 'border-transparent text-[#5f6368] hover:bg-[#f8f9fa]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 relative">
          <button
            className="p-2.5 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors"
            title="Create or join a class"
            aria-label="Create or join a class"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            className="p-2.5 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors hidden sm:inline-flex"
            title="Google apps"
            aria-label="Google apps"
          >
            <Grip className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowProfileMenu((v) => !v)}
            className="ml-1 w-8 h-8 rounded-full bg-[#1967d2] text-white text-sm font-medium flex items-center justify-center hover:ring-4 hover:ring-[#e8f0fe] transition-all"
            title="Account"
          >
            S
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-12 z-20 w-64 rounded-2xl bg-white border border-[#dadce0] shadow-xl p-4 space-y-3 text-sm">
                <div>
                  <div className="font-medium text-[#202124]">Student Account</div>
                  <div className="text-xs text-[#5f6368]">school.workspace@edu.org</div>
                </div>
                <div className="pt-2 border-t border-[#dadce0] text-xs text-[#5f6368]">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-[#f1f3f4] border border-[#dadce0] font-mono text-[11px]">Ctrl</kbd> anytime to switch views.
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onExit();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#f1f3f4] hover:bg-[#e8eaed] text-xs font-medium text-[#3c4043] text-center transition-colors"
                >
                  Return to AltitudeMAX OS
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Navigation Drawer */}
        {sidebarOpen && (
          <aside className="hidden md:flex w-64 shrink-0 border-r border-[#dadce0] bg-white flex-col py-3 overflow-y-auto">
            <button
              onClick={() => {
                setSelectedCourseId(null);
                setNavView('home');
              }}
              className={`mx-2 px-4 py-2.5 rounded-r-full flex items-center gap-4 text-sm font-medium transition-colors ${
                !selectedCourse && navView === 'home'
                  ? 'bg-[#e8f0fe] text-[#1967d2]'
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setSelectedCourseId(null);
                setNavView('calendar');
              }}
              className={`mx-2 px-4 py-2.5 rounded-r-full flex items-center gap-4 text-sm font-medium transition-colors ${
                !selectedCourse && navView === 'calendar'
                  ? 'bg-[#e8f0fe] text-[#1967d2]'
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => {
                setSelectedCourseId(null);
                setNavView('todo');
              }}
              className={`mx-2 px-4 py-2.5 rounded-r-full flex items-center gap-4 text-sm font-medium transition-colors ${
                !selectedCourse && navView === 'todo'
                  ? 'bg-[#e8f0fe] text-[#1967d2]'
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
            >
              <CheckSquare className="w-5 h-5" />
              <span>To-do</span>
            </button>

            <div className="my-2 border-t border-[#e0e0e0]" />
            <div className="px-6 py-1.5 text-xs font-medium text-[#5f6368] uppercase tracking-wider">
              Enrolled
            </div>

            {courses.map((course) => {
              const active = selectedCourseId === course.id;
              return (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setCourseTab('stream');
                  }}
                  className={`mx-2 px-4 py-2 rounded-r-full flex items-center gap-3 text-left transition-colors ${
                    active ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-[#3c4043] hover:bg-[#f1f3f4]'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full ${course.avatarBg} text-white text-xs font-medium flex items-center justify-center shrink-0`}
                  >
                    {course.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{course.name}</div>
                    <div className="text-[11px] text-[#5f6368] truncate">{course.section}</div>
                  </div>
                </button>
              );
            })}

            <div className="mt-auto pt-3 border-t border-[#e0e0e0]">
              <button
                onClick={onExit}
                className="mx-2 w-[calc(100%-16px)] px-4 py-2.5 rounded-r-full flex items-center gap-4 text-sm font-medium text-[#5f6368] hover:bg-[#f1f3f4] transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
            </div>
          </aside>
        )}

        {/* Workspace Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-white p-4 sm:p-6">
          {/* Course Detail View */}
          {selectedCourse ? (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="flex items-center justify-between md:hidden">
                <button
                  onClick={() => setSelectedCourseId(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1967d2]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>All classes</span>
                </button>
                <div className="flex items-center gap-2">
                  {(['stream', 'classwork', 'people'] as CourseTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCourseTab(tab)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        courseTab === tab
                          ? 'bg-[#e8f0fe] text-[#1967d2]'
                          : 'text-[#5f6368] bg-[#f1f3f4]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {courseTab === 'stream' && (
                <>
                  <div
                    className={`rounded-xl bg-gradient-to-r ${selectedCourse.bannerBg} text-white p-6 min-h-[160px] flex flex-col justify-end relative overflow-hidden shadow-sm`}
                  >
                    <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">
                      {selectedCourse.name}
                    </h1>
                    <p className="text-sm text-white/90 mt-1">
                      {selectedCourse.section} · {selectedCourse.teacher}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="md:col-span-1">
                      <div className="rounded-lg border border-[#dadce0] p-4 space-y-2">
                        <div className="text-sm font-medium text-[#3c4043]">Upcoming</div>
                        <div className="text-xs text-[#5f6368]">{selectedCourse.upcomingDue}</div>
                        <div className="text-xs font-medium text-[#1967d2]">
                          {selectedCourse.upcomingTitle}
                        </div>
                        <button
                          onClick={() => setCourseTab('classwork')}
                          className="text-xs font-medium text-[#1967d2] hover:underline pt-1"
                        >
                          View all
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-3 space-y-4">
                      <form
                        onSubmit={handlePostAnnouncement}
                        className="rounded-lg border border-[#dadce0] p-3 flex items-center gap-3 shadow-xs"
                      >
                        <span className="w-8 h-8 rounded-full bg-[#1967d2] text-white text-xs font-medium flex items-center justify-center shrink-0">
                          S
                        </span>
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Announce something to your class"
                          className="flex-1 text-sm text-[#3c4043] placeholder-[#5f6368] outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!commentInput.trim()}
                          className="p-2 rounded-full text-[#1967d2] hover:bg-[#e8f0fe] disabled:opacity-40"
                          aria-label="Post"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>

                      {selectedCourse.announcements.map((post) => (
                        <div
                          key={post.id}
                          className="rounded-lg border border-[#dadce0] p-4 space-y-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-9 h-9 rounded-full ${selectedCourse.avatarBg} text-white text-sm font-medium flex items-center justify-center shrink-0`}
                            >
                              {post.author.charAt(0)}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-[#3c4043]">{post.author}</div>
                              <div className="text-xs text-[#5f6368]">{post.date}</div>
                            </div>
                          </div>
                          <p className="text-sm text-[#3c4043] leading-relaxed">{post.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {courseTab === 'classwork' && (
                <div className="space-y-3">
                  {selectedCourse.assignments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#dadce0] p-4 flex items-start justify-between gap-4 hover:bg-[#f8f9fa] transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full ${selectedCourse.avatarBg} text-white flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#202124]">{item.title}</div>
                          <div className="text-xs text-[#5f6368] mt-0.5">
                            {item.topic} · {item.points} pts · {item.due}
                          </div>
                          <p className="text-xs text-[#5f6368] mt-2 leading-relaxed">
                            {item.instructions}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAssignmentDone(selectedCourse.id, item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 shrink-0 border transition-colors ${
                          item.done
                            ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                            : 'bg-white border-[#dadce0] text-[#1967d2] hover:bg-[#f1f3f4]'
                        }`}
                      >
                        {item.done ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Turned in</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5" />
                            <span>Mark done</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {courseTab === 'people' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-normal text-[#1967d2] pb-3 border-b border-[#1967d2]">
                      Teachers
                    </h2>
                    <div className="py-3 flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full ${selectedCourse.avatarBg} text-white text-sm flex items-center justify-center`}
                      >
                        {selectedCourse.teacher.charAt(0)}
                      </span>
                      <span className="text-sm text-[#3c4043]">{selectedCourse.teacher}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#1967d2]">
                      <h2 className="text-xl font-normal text-[#1967d2]">Classmates</h2>
                      <span className="text-xs text-[#1967d2]">
                        {selectedCourse.classmates.length} students
                      </span>
                    </div>
                    <div className="divide-y divide-[#dadce0]">
                      {selectedCourse.classmates.map((student) => (
                        <div key={student} className="py-3 flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1967d2] text-sm font-medium flex items-center justify-center">
                            {student.charAt(0)}
                          </span>
                          <span className="text-sm text-[#3c4043]">{student}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : navView === 'todo' ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-xl font-medium text-[#202124]">To-do</h1>
              <div className="divide-y divide-[#dadce0] border border-[#dadce0] rounded-lg">
                {allTodoAssignments.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[#f8f9fa]"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#202124] truncate">{item.title}</div>
                      <div className="text-xs text-[#5f6368] mt-0.5">
                        {item.courseName} · {item.due}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAssignmentDone(item.courseId, item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border ${
                        item.done
                          ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                          : 'bg-white border-[#dadce0] text-[#1967d2]'
                      }`}
                    >
                      {item.done ? 'Turned in' : 'Assigned'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : navView === 'calendar' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <h1 className="text-xl font-medium text-[#202124]">Class Schedule & Deadlines</h1>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => (
                  <div key={day} className="border border-[#dadce0] rounded-lg p-3 min-h-[220px] space-y-2">
                    <div className="text-xs font-medium text-[#5f6368] uppercase pb-2 border-b border-[#dadce0]">
                      {day} · Nov {23 + idx}
                    </div>
                    {courses[idx] && (
                      <button
                        onClick={() => {
                          setSelectedCourseId(courses[idx].id);
                          setCourseTab('classwork');
                        }}
                        className="w-full text-left p-2 rounded bg-[#e8f0fe] text-[#1967d2] text-xs font-medium hover:bg-[#d2e3fc]"
                      >
                        <div className="truncate">{courses[idx].name}</div>
                        <div className="text-[11px] font-normal truncate">
                          {courses[idx].upcomingTitle}
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Home Classes Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setCourseTab('stream');
                  }}
                  className="group rounded-lg border border-[#dadce0] bg-white overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                >
                  <div
                    className={`h-[100px] bg-gradient-to-r ${course.bannerBg} p-4 text-white flex flex-col justify-between relative`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-[18px] font-medium leading-tight truncate group-hover:underline">
                          {course.name}
                        </h2>
                        <div className="text-xs text-white/90 truncate mt-0.5">
                          {course.section}
                        </div>
                      </div>
                      <MoreVertical className="w-4 h-4 text-white/90 shrink-0" />
                    </div>
                    <div className="text-xs text-white/95 truncate">{course.teacher}</div>

                    <div
                      className={`w-16 h-16 rounded-full ${course.avatarBg} text-white text-2xl font-normal flex items-center justify-center absolute right-4 -bottom-8 shadow border-2 border-white`}
                    >
                      {course.teacher.split(' ').pop()?.charAt(0) ?? 'T'}
                    </div>
                  </div>

                  <div className="p-4 pt-5 flex-1 min-h-[105px] space-y-1.5">
                    <div className="text-xs text-[#5f6368]">{course.upcomingDue}</div>
                    <div className="text-xs font-medium text-[#3c4043] line-clamp-2">
                      {course.upcomingTitle}
                    </div>
                  </div>

                  <div className="px-3 py-2 border-t border-[#dadce0] flex items-center justify-end gap-1 text-[#5f6368]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourseId(course.id);
                        setCourseTab('people');
                      }}
                      className="p-2 rounded-full hover:bg-[#f1f3f4]"
                      aria-label="Open class people"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourseId(course.id);
                        setCourseTab('classwork');
                      }}
                      className="p-2 rounded-full hover:bg-[#f1f3f4]"
                      aria-label="Open classwork"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
