import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Tesseract from 'tesseract.js';
import { supabase } from './supabaseClient';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { Icons } from './icons/Icons';
import { CHART_COLORS, DEPT_ABBREVIATIONS, DEPT_BANNER_IMAGES, universityDepartments } from './constants';
import {
  getDeptAbbrev,
  getDeptPresets,
  getFullDepartmentName,
  getDeptBannerStyle,
  extractDeptAbbrev,
  timeAgo,
  getNotificationIcon,
  compressImage,
  getTicketImages,
  parseHarassmentReport,
  parseCoordinates,
  safeParseLikes,
  MUET_KEYWORD_PATTERNS,
  hasInstitutionKeyword,
  extractRollCandidates,
  REQUIRE_VALID_TILL,
  MONTHS,
  extractValidTill,
  preprocessIdImage,
} from './utils';
import LocationMarker from './components/LocationMarker';
import DeptBannerImage from './components/DeptBannerImage';
import StatusPipeline from './components/StatusPipeline';
import ImageGalleryImpl from './components/ImageGallery';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function App() {
  const [user, setUser] = useState(null);
  const [lastResendTime, setLastResendTime] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [verificationState, setVerificationState] = useState(null);
  const [resending, setResending] = useState(false);
  const [setupState, setSetupState] = useState({ step: 'idle', rollNumber: '', department: '', deptAbbrev: '', batch: '', officialEmail: '' });
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupPersonalEmail, setSetupPersonalEmail] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [showSetupConfirmPassword, setShowSetupConfirmPassword] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [studentLoginRoll, setStudentLoginRoll] = useState('');
  const [studentLoginPassword, setStudentLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isStudentLoggingIn, setIsStudentLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotRollNumber, setForgotRollNumber] = useState('');
  const [forgotState, setForgotState] = useState({ step: 'idle', roll: '', email: '' });
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adminForgotEmail, setAdminForgotEmail] = useState('');
  const [adminForgotState, setAdminForgotState] = useState({ step: 'idle', email: '' });
  const [isSendingAdminReset, setIsSendingAdminReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [uploadedIdCardName, setUploadedIdCardName] = useState(null);
  const [resendCount, setResendCount] = useState(0);
  const [tick, setTick] = useState(0);
  const [currentRole, setCurrentRole] = useState('student');
  const [activeSidebarTab, setActiveSidebarTab] = useState('dept_home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [localLikes, setLocalLikes] = useState(safeParseLikes);
  const [resendLockUntil, setResendLockUntil] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [category, setCategory] = useState('Electrical');
  const [deptNameInput, setDeptNameInput] = useState('Computer Systems Engineering');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [issueImages, setIssueImages] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [pastedCoords, setPastedCoords] = useState('');
  const [showHarassmentForm, setShowHarassmentForm] = useState(false);
  const [h_fullName, setH_FullName] = useState('');
  const [h_contact, setH_Contact] = useState('');
  const [h_accusedType, setH_AccusedType] = useState('Student');
  const [h_accusedName, setH_AccusedName] = useState('');
  const [h_description, setH_Description] = useState('');
  const [h_evidence, setH_Evidence] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedHarassment, setSelectedHarassment] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [sortBy, setSortBy] = useState('most_liked');
  const [harassmentFilter, setHarassmentFilter] = useState('all');
  const chatEndRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [snackbarTimeout, setSnackbarTimeout] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState(false);
  const [qrRoomName, setQrRoomName] = useState('');
  const [generatedQRs, setGeneratedQRs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifDropdownRef = useRef(null);

  // refs to block rapid double clicks
  const uploadLockRef = useRef(false);
  const resendLockRef = useRef(false);

  const isStudent = currentRole === 'student';
  const isHOD = currentRole !== 'student' && currentRole !== 'General' && currentRole !== 'Harassment';
  const isGeneralAdmin = currentRole === 'General';
  const isHarassmentAdmin = currentRole === 'Harassment';

  const getRoleDisplayName = () => {
    if (isStudent) return user?.rollNumber || '';
    if (isGeneralAdmin) return '🏢 General Admin';
    if (isHarassmentAdmin) return '🛡️ Harassment Cell';
    return `👨‍🏫 HOD • ${currentRole}`;
  };

  const fullUserDepartment = user ? getFullDepartmentName(user.department) : '';
  const currentSenderName = isStudent ? `Student ${user?.rollNumber}` : `${currentRole} Admin`;

  const harassmentTickets = useMemo(() => tickets.filter(t => t.category === 'Harassment'), [tickets]);
  const nonHarassmentTickets = useMemo(() => tickets.filter(t => t.category !== 'Harassment'), [tickets]);

  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    const previews = issueImages.map(file => ({ file, url: URL.createObjectURL(file) }));
    setImagePreviews(previews);
    return () => { previews.forEach(preview => URL.revokeObjectURL(preview.url)); };
  }, [issueImages]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { alert('❌ GPS not supported'); return; }
    triggerSnackbar('📍 Detecting location...');
    navigator.geolocation.getCurrentPosition(
      (position) => { setSelectedPosition([position.coords.latitude, position.coords.longitude]); triggerSnackbar(`📍 Location detected (±${Math.round(position.coords.accuracy)}m)`); },
      () => { alert('Location access denied.'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const showCoordsHelp = () => {
    alert(`📖 HOW TO GET COORDINATES FROM GOOGLE MAPS:\n\n1. Click "Google Maps" button\n2. Navigate to location\n3. RIGHT-CLICK (desktop) OR LONG-PRESS (mobile)\n4. Copy coordinates (e.g., 25.4089, 68.2619)\n5. Paste in "Paste coordinates" field\n6. Click "Pin It"`);
  };

  // Restore user session on mount
  useEffect(() => {
    const fetchSecureUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setUser(null); setCurrentRole('student'); localStorage.removeItem('campus_auth_user'); return; }
        const { data: studentData } = await supabase.from('verified_students').select('*').eq('auth_user_id', session.user.id).maybeSingle();
        if (studentData) {
          setUser({ rollNumber: studentData.roll_number, batch: studentData.batch, department: studentData.department, deptAbbrev: studentData.dept_abbrev, expiry: 'Verified' });
          setCurrentRole('student');
          const pendingRoom = localStorage.getItem('pending_qr_room');
          if (pendingRoom) { setLocation(pendingRoom); setCategory('General'); setShowReportModal(true); localStorage.removeItem('pending_qr_room'); triggerSnackbar(`📍 QR detected: ${pendingRoom}`); }
        } else {
          const { data: adminData } = await supabase.from('profiles').select('role, department, full_name').eq('id', session.user.id).maybeSingle();
          if (adminData) {
            setUser(null);
            if (adminData.role === 'hod') { setCurrentRole(adminData.department); setActiveSidebarTab('analytics'); }
            else if (adminData.role === 'general_admin') { setCurrentRole('General'); setActiveSidebarTab('analytics'); }
            else if (adminData.role === 'harassment_admin') { setCurrentRole('Harassment'); setActiveSidebarTab('harassment_reports'); }
          }
        }
      } finally { setIsAuthChecking(false); }
    };
    fetchSecureUserSession();
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify');
    const isReset = params.get('reset');
    if (token) { handleVerifyToken(token); window.history.replaceState({}, '', window.location.pathname); }
    if (isReset === 'true') { setShowResetPasswordModal(true); window.history.replaceState({}, '', window.location.pathname); }

    // supabase fires this on token refresh too - only refetch on meaningful events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetPasswordModal(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        fetchSecureUserSession();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // refresh the lock countdown text every 30s
  useEffect(() => {
    if (!resendLockUntil) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [resendLockUntil]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const decodedRoom = roomParam;
      if (user && isStudent) { setLocation(decodedRoom); setCategory('General'); setShowReportModal(true); triggerSnackbar(`📍 QR detected: ${decodedRoom}`); window.history.replaceState({}, '', window.location.pathname); }
      else { localStorage.setItem('pending_qr_room', decodedRoom); window.history.replaceState({}, '', window.location.pathname); if (!user) setErrorMsg(`📍 QR detected from "${decodedRoom}". Please login to report.`); }
    }
  }, [user, currentRole]);

  // load stored resend counter and lock state
  useEffect(() => {
    if (verificationState?.rollNumber) {
      const roll = verificationState.rollNumber;
      const savedCount = localStorage.getItem(`resend_count_${roll}`);
      const savedLock = localStorage.getItem(`resend_lock_until_${roll}`);
      const lockUntil = savedLock ? parseInt(savedLock, 10) : null;

      if (lockUntil && Date.now() >= lockUntil) {
        localStorage.removeItem(`resend_count_${roll}`);
        localStorage.removeItem(`resend_lock_until_${roll}`);
        setResendCount(0);
        setResendLockUntil(null);
      } else if (lockUntil) {
        setResendCount(3);
        setResendLockUntil(lockUntil);
      } else if (savedCount) {
        setResendCount(parseInt(savedCount, 10));
        setResendLockUntil(null);
      }
    } else {
      setResendCount(0);
      setResendLockUntil(null);
    }
  }, [verificationState]);

  // realtime tickets - falls back to polling if the channel drops
  useEffect(() => {
    fetchTickets(true);
    let realtimeConnected = false;
    let pollInterval = null;
    const channel = supabase.channel('public:tickets-realtime-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => { fetchTickets(false); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { realtimeConnected = true; if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } console.log('[Realtime] Connected'); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { realtimeConnected = false; console.warn('[Realtime] Not connected:', status); }
      });
    pollInterval = setInterval(() => { if (!realtimeConnected) { console.log('[Polling] Fallback refresh'); fetchTickets(false); } }, 10000);
    return () => { supabase.removeChannel(channel); if (pollInterval) clearInterval(pollInterval); };
  }, []);

  useEffect(() => { if (selectedTicket && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [selectedTicket?.comments]);

  useEffect(() => {
    const identifier = getMyIdentifier();
    if (!identifier) { setNotifications([]); return; }
    fetchNotifications();
    const channel = supabase.channel('notif-' + identifier + '-' + Date.now())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_identifier=eq.${identifier}` }, () => { fetchNotifications(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, currentRole]);

  useEffect(() => {
    const handler = (e) => { if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) { setShowNotifications(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const userIdentifier = isStudent && user ? user.rollNumber : (isHOD ? currentRole : (isGeneralAdmin ? 'General' : (isHarassmentAdmin ? 'Harassment' : null)));
    if (!userIdentifier) return;
    const fetchMyLikes = async () => {
      const { data, error } = await supabase.from('ticket_likes').select('ticket_id').eq('user_roll', userIdentifier);
      if (!error && data) { const dbLikes = data.map(row => row.ticket_id); setLocalLikes(dbLikes); localStorage.setItem('local_upvotes', JSON.stringify(dbLikes)); }
    };
    fetchMyLikes();
  }, [user, currentRole]);

  const getMyIdentifier = () => {
    if (isStudent && user) return user.rollNumber;
    if (isHOD) return currentRole;
    if (isGeneralAdmin) return 'General';
    if (isHarassmentAdmin) return 'Harassment';
    return null;
  };

  const fetchNotifications = async () => {
    const identifier = getMyIdentifier();
    if (!identifier) { setNotifications([]); return; }
    const { data } = await supabase.from('notifications').select('*').eq('recipient_identifier', identifier).order('created_at', { ascending: false }).limit(30);
    if (data) setNotifications(data);
  };

  const markNotificationAsRead = async (notifId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const markAllNotificationsAsRead = async () => {
    const identifier = getMyIdentifier();
    if (!identifier) return;
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_identifier', identifier).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) { await markNotificationAsRead(notif.id); }
    setShowNotifications(false);
    if (notif.ticket_id) {
      const { data } = await supabase.from('tickets_masked').select('*').eq('id', notif.ticket_id).maybeSingle();
      if (data) { if (data.category === 'Harassment' && isHarassmentAdmin) { setSelectedHarassment(data); } else { setSelectedTicket(data); } }
    }
  };

  const openTicketFresh = async (ticket) => {
    if (!ticket?.id) return;
    const { data } = await supabase.from('tickets_masked').select('*').eq('id', ticket.id).maybeSingle();
    setSelectedTicket(data || ticket);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const triggerSnackbar = (msg) => {
    setSuccessMsg(msg);
    if (snackbarTimeout) clearTimeout(snackbarTimeout);
    const timeout = setTimeout(() => setSuccessMsg(''), 2500);
    setSnackbarTimeout(timeout);
  };

  const fetchTickets = async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoadingTickets(true);
    setTicketsError(false);
    try {
      const { data, error } = await supabase.from('tickets_masked').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setTickets(data);
    } catch (error) { console.error(error); setTicketsError(true); }
    finally { if (isInitialLoad) setIsLoadingTickets(false); }
  };

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => sortBy === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : (b.upvotes || 0) - (a.upvotes || 0));
  }, [tickets, sortBy]);

  // Builds all the numbers used on the analytics dashboards
  const getAnalyticsData = () => {
    let relevantTickets;
    if (isGeneralAdmin) relevantTickets = nonHarassmentTickets;
    else if (isHOD) relevantTickets = nonHarassmentTickets.filter(t => t.location?.includes(currentRole) || t.category === currentRole);
    else relevantTickets = [];
    const categoryMap = {};
    relevantTickets.forEach(t => { const cat = t.category || 'Other'; categoryMap[cat] = (categoryMap[cat] || 0) + 1; });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    const statusData = [
      { name: 'Under Review', value: relevantTickets.filter(t => t.status === 'UNDER_REVIEW').length, fill: '#f59e0b' },
      { name: 'Resolved', value: relevantTickets.filter(t => t.status === 'RESOLVED').length, fill: '#10b981' },
    ];
    const deptMap = {};
    relevantTickets.forEach(t => { const match = t.location?.match(/^\[([^\]]+)\]/); const dept = match ? match[1] : 'General'; deptMap[dept] = (deptMap[dept] || 0) + 1; });
    const deptData = Object.entries(deptMap).map(([name, value]) => ({ name: name.replace(' Engineering', ' Eng.').substring(0, 20), value })).sort((a, b) => b.value - a.value).slice(0, 6);
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStart = new Date(new Date(d).setHours(0, 0, 0, 0));
      const dayEnd = new Date(new Date(d).setHours(23, 59, 59, 999));
      const count = relevantTickets.filter(t => { const created = new Date(t.created_at); return created >= dayStart && created <= dayEnd; }).length;
      last7Days.push({ day: dayLabel, tickets: count });
    }
    const totalTickets = relevantTickets.length;
    const resolved = relevantTickets.filter(t => t.status === 'RESOLVED').length;
    const pending = totalTickets - resolved;
    const resolutionRate = totalTickets > 0 ? Math.round((resolved / totalTickets) * 100) : 0;
    return { categoryData, statusData, deptData, last7Days, totalTickets, resolved, pending, resolutionRate, relevantTickets };
  };

  const getHarassmentStats = () => {
    const total = harassmentTickets.length;
    const open = harassmentTickets.filter(t => t.status !== 'RESOLVED').length;
    const resolved = harassmentTickets.filter(t => t.status === 'RESOLVED').length;
    return { total, open, resolved };
  };

  const getFilteredHarassmentTickets = () => {
    if (harassmentFilter === 'open') return harassmentTickets.filter(t => t.status !== 'RESOLVED');
    if (harassmentFilter === 'resolved') return harassmentTickets.filter(t => t.status === 'RESOLVED');
    return harassmentTickets;
  };

  const findVerifiedStudent = async (rollNumber) => {
    const { data, error } = await supabase.from('verified_students').select('*').eq('roll_number', rollNumber).maybeSingle();
    if (error) return null;
    return data;
  };

  const initiateVerification = async (candidate, forceResend = false) => {
    setVerificationState({ step: 'sending' }); setErrorMsg('');
    const officialEmail = `${candidate.roll.toLowerCase()}@students.muet.edu.pk`;
    const department = getFullDepartmentName(candidate.dept);
    const batch = `Batch ${candidate.batchYear}`;
    try {
      const existing = await findVerifiedStudent(candidate.roll);
      if (existing && existing.personal_email) { setVerificationState(null); setErrorMsg(`⚠️ Roll number ${candidate.roll} is already registered. Please login.`); return; }
      let token = null;
      let shouldSendEmail = true;
      const { data: existingPending } = await supabase.from('pending_verifications').select('token, expires_at, created_at').eq('roll_number', candidate.roll).eq('used', false).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (existingPending?.token) {
        token = existingPending.token;
        const timeSinceCreation = (Date.now() - new Date(existingPending.created_at).getTime()) / 1000;
        if (timeSinceCreation < 120 && !forceResend) { setVerificationState({ step: 'sent', email: officialEmail, rollNumber: candidate.roll }); triggerSnackbar('📧 Email already sent recently. Check your inbox.'); return; }
      } else {
        token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
        const { error: insertErr } = await supabase.from('pending_verifications').insert([{ token, roll_number: candidate.roll, department, dept_abbrev: candidate.dept, batch, email: officialEmail }]);
        if (insertErr) { setVerificationState(null); setErrorMsg('Could not create verification request.'); return; }
      }
      if (shouldSendEmail) {
        const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=${token}`;
        const { error: emailError } = await supabase.functions.invoke('send-email', { body: { to_email: officialEmail, roll_number: candidate.roll, verify_url: verifyUrl, template_type: 'verify' } });
        if (emailError) throw new Error(emailError.message || 'Email sending failed');
      }
      setVerificationState({ step: 'sent', email: officialEmail, rollNumber: candidate.roll });
    } catch (err) {
      setVerificationState(null);
      setErrorMsg('Verification email could not be sent.');
      throw err; // bubble up so the caller can handle rate limits
    }
  };

  const handleVerifyToken = async (token) => {
    setVerificationState({ step: 'verifying' });
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('pending_verifications').select('*').eq('token', token).eq('used', false).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (error || !data) { setErrorMsg('⚠️ Verification link is invalid or expired. Please upload your ID card again.'); setVerificationState(null); return; }
      await supabase.from('pending_verifications').update({ used: true }).eq('id', data.id);
      setSetupState({ step: 'setting-up', rollNumber: data.roll_number, department: data.department, deptAbbrev: data.dept_abbrev, batch: data.batch, officialEmail: data.email });
      setVerificationState(null);
      triggerSnackbar('✓ Email verified! Complete your setup.');
    } catch (err) { setErrorMsg('⚠️ Verification failed. Please try again.'); setVerificationState(null); }
  };

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    if (setupPassword.length < 6) { setErrorMsg('⚠️ Password must be at least 6 characters'); return; }
    if (setupPassword !== setupConfirmPassword) { setErrorMsg('⚠️ Passwords do not match'); return; }
    if (!setupPersonalEmail.includes('@') || !setupPersonalEmail.includes('.')) { setErrorMsg('⚠️ Enter a valid personal email'); return; }
    setIsSettingUp(true); setErrorMsg('');

    try {
      const personalEmail = setupPersonalEmail.toLowerCase().trim();
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: personalEmail,
        password: setupPassword,
        options: { data: { roll_number: setupState.rollNumber, full_name: setupState.rollNumber, role: 'student' } }
      });

      if (authErr) {
        if (authErr.message.toLowerCase().includes('already')) setErrorMsg('⚠️ Personal email already registered. Use a different one.');
        else setErrorMsg(authErr.message);
        setIsSettingUp(false);
        return;
      }

      const { error: insertErr } = await supabase.from('verified_students').insert([{
        roll_number: setupState.rollNumber,
        department: setupState.department,
        dept_abbrev: setupState.deptAbbrev,
        batch: setupState.batch,
        email: setupState.officialEmail,
        personal_email: personalEmail,
        auth_user_id: authData.user.id
      }]);

      if (insertErr) {
        // auth user already created but student row failed - sign out and warn clearly
        await supabase.auth.signOut();
        if (insertErr.code === '23505') {
          setErrorMsg('⚠️ Roll number already registered. Please use Login instead.');
        } else {
          setErrorMsg(`Setup failed: ${insertErr.message}. Please try a different email or contact support.`);
        }
        setIsSettingUp(false);
        return;
      }

      const authenticatedUser = {
        rollNumber: setupState.rollNumber,
        batch: setupState.batch,
        department: setupState.department,
        deptAbbrev: setupState.deptAbbrev,
        expiry: 'Verified'
      };

      setUser(authenticatedUser);
      setCurrentRole('student');

      // purge the uploaded ID card via the edge function
      const idCardToDelete = uploadedIdCardName || localStorage.getItem('pending_id_card_name');
      if (idCardToDelete) {
        try {
          const { error: deleteError } = await supabase.functions.invoke('idcardsdel', {
            body: { fileName: idCardToDelete }
          });
          if (deleteError) {
            console.error('ID card auto-delete failed:', deleteError.message);
          } else {
            console.log('ID card successfully deleted from bucket!');
            setUploadedIdCardName(null);
            localStorage.removeItem('pending_id_card_name');
          }
        } catch (err) {
          console.error('Error calling delete function:', err);
        }
      }

      setSetupState({ step: 'idle', rollNumber: '', department: '', deptAbbrev: '', batch: '', officialEmail: '' });
      setSetupPassword(''); setSetupConfirmPassword(''); setSetupPersonalEmail('');

      const pendingRoom = localStorage.getItem('pending_qr_room');
      if (pendingRoom) {
        setLocation(pendingRoom);
        setCategory('General');
        setShowReportModal(true);
        localStorage.removeItem('pending_qr_room');
        triggerSnackbar(`🎉 Welcome! Location: ${pendingRoom}`);
      } else {
        triggerSnackbar('🎉 Account created!');
      }
    } catch (err) {
      setErrorMsg('Something went wrong.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    if (!studentLoginRoll.trim() || !studentLoginPassword.trim()) return;
    setIsStudentLoggingIn(true); setErrorMsg('');
    try {
      const roll = studentLoginRoll.trim().toUpperCase();
      const { data: record, error: fetchErr } = await supabase.from('verified_students').select('*').eq('roll_number', roll).maybeSingle();
      if (fetchErr || !record) { setErrorMsg(`❌ Roll number "${roll}" is not registered.`); setIsStudentLoggingIn(false); return; }
      if (!record.personal_email) { setErrorMsg('⚠️ Account setup incomplete.'); setIsStudentLoggingIn(false); return; }
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: record.personal_email, password: studentLoginPassword });
      if (authErr) { setErrorMsg('❌ Invalid roll number or password.'); setIsStudentLoggingIn(false); return; }
      const authenticatedUser = { rollNumber: record.roll_number, batch: record.batch, department: record.department, deptAbbrev: record.dept_abbrev || extractDeptAbbrev(record.roll_number), expiry: 'Verified' };
      setUser(authenticatedUser); setCurrentRole('student');
      setStudentLoginRoll(''); setStudentLoginPassword('');
      const pendingRoom = localStorage.getItem('pending_qr_room');
      if (pendingRoom) { setLocation(pendingRoom); setCategory('General'); setShowReportModal(true); localStorage.removeItem('pending_qr_room'); triggerSnackbar(`📍 Welcome back! Location: ${pendingRoom}`); }
      else triggerSnackbar('✓ Login successful!');
    } catch (err) { setErrorMsg('Login failed.'); } finally { setIsStudentLoggingIn(false); }
  };

  const handleStudentForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotRollNumber.trim()) return;
    setIsSendingReset(true); setErrorMsg('');
    try {
      const roll = forgotRollNumber.trim().toUpperCase();
      const { data: record, error: fetchErr } = await supabase.from('verified_students').select('personal_email').eq('roll_number', roll).maybeSingle();
      if (fetchErr || !record || !record.personal_email) { setErrorMsg(`❌ Roll number "${roll}" not found.`); setIsSendingReset(false); return; }
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(record.personal_email, { redirectTo: `${window.location.origin}${window.location.pathname}?reset=true` });
      if (resetErr) { setErrorMsg(resetErr.message); setIsSendingReset(false); return; }
      setForgotState({ step: 'sent', roll, email: record.personal_email });
      triggerSnackbar(`📧 Reset link sent to ${record.personal_email}`);
    } catch (err) { setErrorMsg('Failed to send reset email.'); } finally { setIsSendingReset(false); }
  };
    const handleIdUpload = async (e) => {
    const inputEl = e.target;
    const file = inputEl.files[0];
    if (!file) return;

    // block rapid double-clicks
    if (uploadLockRef.current) {
      if (inputEl) inputEl.value = '';
      return;
    }
    uploadLockRef.current = true;

    setScanning(true); setScanProgress(0); setErrorMsg('');
    let uploadedFileName = null;
    try {
      let combinedText = '';
      const modes = ['original'];
      for (let i = 0; i < modes.length; i++) {
        const source = modes[i] === 'original' ? file : await preprocessIdImage(file, modes[i]);
        if (!source) continue;
        const result = await Tesseract.recognize(source, 'eng', { logger: (m) => { if (m.status === 'recognizing text') { setScanProgress(Math.round(((i + m.progress) / modes.length) * 100)); } } });
        combinedText += `\n${result.data.text}`;
        if (extractRollCandidates(combinedText).length > 0) break;
      }
      const candidates = extractRollCandidates(combinedText);
      const hasKeyword = hasInstitutionKeyword(combinedText);
      if (!hasKeyword) throw new Error('MUET logo/text not detected.');
      if (candidates.length === 0) throw new Error('Roll number format not recognized.');
      const currentYear = new Date().getFullYear();
      const activeCandidate = candidates.find(c => c.batchYear + 4 >= currentYear);
      if (!activeCandidate) throw new Error(`Batch ${candidates[0].batchYear} has passed out.`);
      const validTill = extractValidTill(combinedText);

      const { data: existingStudent } = await supabase
        .from('verified_students')
        .select('roll_number, personal_email')
        .eq('roll_number', activeCandidate.roll)
        .maybeSingle();

      if (existingStudent && existingStudent.personal_email) {
        throw new Error(`⚠️ Roll number ${activeCandidate.roll} is already registered.\n\nPlease use the Login form above instead of uploading ID card again.`);
      }
      if (!validTill) throw new Error('⚠️ Could not read "Valid till" date from ID card. Please upload a clearer image.');
      if (validTill.date < new Date()) throw new Error(`❌ ID card expired on ${validTill.label}. Please upload a valid card.`);

      const fileName = `temp_${Date.now()}_${file.name}`;
      uploadedFileName = fileName;
      setUploadedIdCardName(fileName);
      localStorage.setItem('pending_id_card_name', fileName);

      const { error: idUploadError } = await supabase.storage.from('id-cards').upload(fileName, file);
      if (idUploadError) throw new Error('ID card upload failed. Please try again.');

      const { data: urlData } = supabase.storage.from('id-cards').getPublicUrl(fileName);
      const officialEmail = `${activeCandidate.roll.toLowerCase()}@students.muet.edu.pk`;
      const department = getFullDepartmentName(activeCandidate.dept);
      const batch = `Batch ${activeCandidate.batchYear}`;
      const { data, error } = await supabase.functions.invoke('verify-id-card', { body: { extracted_text: combinedText, image_url: urlData.publicUrl, roll_number: activeCandidate.roll, department: department, dept_abbrev: activeCandidate.dept, batch: batch, official_email: officialEmail } });
      if (error) throw new Error(error.message);

      // fresh upload means we reset the resend counter for this roll
      await supabase
        .from('pending_verifications')
        .update({ resend_count: 0, last_resend_at: new Date().toISOString() })
        .eq('roll_number', activeCandidate.roll)
        .eq('used', false);

      localStorage.removeItem(`resend_count_${activeCandidate.roll}`);
      localStorage.removeItem(`resend_lock_until_${activeCandidate.roll}`);
      setResendCount(0);
      setResendLockUntil(null);
      setLastResendTime(null);

      const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=${data.token}`;
      const { error: emailError } = await supabase.functions.invoke('send-email', { body: { to_email: officialEmail, roll_number: activeCandidate.roll, verify_url: verifyUrl, template_type: 'verify' } });
      if (emailError) {
        await supabase.storage.from('id-cards').remove([fileName]);
        uploadedFileName = null;
        localStorage.removeItem('pending_id_card_name');
        throw new Error('Verification email could not be sent.');
      }

      setVerificationState({ step: 'sent', email: officialEmail, rollNumber: activeCandidate.roll });
    } catch (err) {
      if (uploadedFileName) {
        try { await supabase.storage.from('id-cards').remove([uploadedFileName]); } catch (cleanupErr) { console.error('Cleanup failed:', cleanupErr); }
        localStorage.removeItem('pending_id_card_name');
      }
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setScanning(false);
      if (inputEl) inputEl.value = '';
      uploadLockRef.current = false;
    }
  };

  const handleResendVerification = async () => {
    if (!verificationState?.rollNumber) return;
    const roll = verificationState.rollNumber;

    // guard against rapid clicks
    if (resendLockRef.current) return;
    resendLockRef.current = true;

    try {
      // check if the 10-minute lock is still active
      const lockUntil = resendLockUntil || parseInt(localStorage.getItem(`resend_lock_until_${roll}`) || '0', 10);

      if (lockUntil && Date.now() < lockUntil) {
        const minutesLeft = Math.ceil((lockUntil - Date.now()) / 60000);
        triggerSnackbar(`⏳ Your 3 attempts are complete. You can try 3 more times after ${minutesLeft} minute(s)`);
        return;
      }

      // lock expired - reset everything
      if (lockUntil && Date.now() >= lockUntil) {
        localStorage.removeItem(`resend_count_${roll}`);
        localStorage.removeItem(`resend_lock_until_${roll}`);
        setResendCount(0);
        setResendLockUntil(null);
      }

      // no more than 3 resends per window
      if (resendCount >= 3) {
        const newLockUntil = Date.now() + (10 * 60 * 1000);
        localStorage.setItem(`resend_lock_until_${roll}`, newLockUntil.toString());
        setResendLockUntil(newLockUntil);
        triggerSnackbar('⏳ Your 3 attempts are complete. Please try again after 10 minutes.');
        return;
      }

      // two-minute cooldown between resends
      if (lastResendTime && (Date.now() - lastResendTime) < 120000) {
        const secondsLeft = Math.ceil((120000 - (Date.now() - lastResendTime)) / 1000);
        triggerSnackbar(`⏱️ Please wait ${secondsLeft}s before resending.`);
        return;
      }

      setResending(true);
      try {
        const m = roll.match(/^(\d{2})([A-Z]{2,4})(\d+)$/);
        if (!m) return;
        const candidate = { roll, dept: m[2], batchYear: 2000 + parseInt(m[1], 10) };

        await initiateVerification(candidate, true);

        setLastResendTime(Date.now());
        const newCount = resendCount + 1;
        setResendCount(newCount);
        localStorage.setItem(`resend_count_${roll}`, newCount.toString());

        if (newCount >= 3) {
          const newLockUntil = Date.now() + (10 * 60 * 1000);
          localStorage.setItem(`resend_lock_until_${roll}`, newLockUntil.toString());
          setResendLockUntil(newLockUntil);
          triggerSnackbar('✓ Email sent. Aapki 3 attempts poori ho gayi hain. 10 minute baad dobara try kar sakte hain.');
        } else {
          triggerSnackbar(`✓ Verification email resent. (Attempt ${newCount}/3)`);
        }
      } catch (err) {
        const errMsg = err?.message || '';
        if (errMsg.includes('429') || errMsg.toLowerCase().includes('maximum resend limit') || errMsg.toLowerCase().includes('wait')) {
          triggerSnackbar('⏳ Your 3 attempts are complete. Please try again after 10 minutes.');
          const newLockUntil = Date.now() + (10 * 60 * 1000);
          localStorage.setItem(`resend_lock_until_${roll}`, newLockUntil.toString());
          setResendLockUntil(newLockUntil);
          setResendCount(3);
        } else {
          triggerSnackbar('❌ Email could not be sent. Please try again.');
        }
      } finally {
        setResending(false);
      }
    } finally {
      resendLockRef.current = false;
    }
  };

  const handleRoleSelection = (selectedOption) => {
    if (selectedOption === 'student') { setCurrentRole('student'); return; }
    if (selectedOption === 'dept_admin' || selectedOption === 'General' || selectedOption === 'Harassment') { setShowAdminModal(true); setAdminForgotState({ step: 'idle', email: '' }); setAuthError(''); return; }
  };

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault(); setIsLoggingIn(true); setAuthError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      if (authError) throw authError;
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role, department, full_name').eq('id', authData.user.id).single();
      if (profileError || !profile) throw new Error('Profile not found.');
      setUser(null);
      if (profile.role === 'hod') { setCurrentRole(profile.department); setActiveSidebarTab('analytics'); }
      else if (profile.role === 'general_admin') { setCurrentRole('General'); setActiveSidebarTab('analytics'); }
      else if (profile.role === 'harassment_admin') { setCurrentRole('Harassment'); setActiveSidebarTab('harassment_reports'); }
      setShowAdminModal(false); setAdminEmail(''); setAdminPassword('');
      triggerSnackbar(`✓ Authenticated as ${profile.full_name || profile.role}`);
    } catch (err) { setAuthError(err.message || 'Invalid email or password.'); } finally { setIsLoggingIn(false); }
  };

  const handleAdminForgotPassword = async (e) => {
    e.preventDefault(); setIsSendingAdminReset(true); setAuthError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(adminForgotEmail, { redirectTo: `${window.location.origin}${window.location.pathname}?reset=true` });
      if (error) throw error;
      setAdminForgotState({ step: 'sent', email: adminForgotEmail });
    } catch (err) { setAuthError(err.message || 'Failed to send reset email.'); } finally { setIsSendingAdminReset(false); }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault(); setIsResettingPassword(true); setAuthError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      setShowResetPasswordModal(false); setNewPassword('');
      triggerSnackbar('Password updated! Please login.');
    } catch (err) { setAuthError(err.message || 'Failed to update password.'); } finally { setIsResettingPassword(false); }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (err) { console.error('Sign-out failed:', err); }
    localStorage.removeItem('campus_auth_user');
    setUser(null); setCurrentRole('student'); setActiveSidebarTab('dept_home');
    setSelectedTicket(null); setSelectedHarassment(null); setShowNotifications(false); setNotifications([]);
    triggerSnackbar('Logged out');
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !location.trim()) { alert('⚠️ Please fill out all required fields properly.'); return; }
    setSubmitting(true);
    const failedUploads = [];
    const uploadedFileNames = [];
    try {
      const uploadedUrls = [];
      if (issueImages.length > 0) {
        for (let i = 0; i < issueImages.length; i++) {
          const file = issueImages[i];
          try {
            const compressedFile = await compressImage(file);
            const ext = compressedFile.name.split('.').pop().toLowerCase();
            const uniqueName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}_${user?.rollNumber || 'ADMIN'}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('issue-images').upload(uniqueName, compressedFile, { cacheControl: '3600', upsert: false });
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('issue-images').getPublicUrl(uniqueName);
              uploadedUrls.push(urlData.publicUrl);
              uploadedFileNames.push(uniqueName);
            }
            else { failedUploads.push(file.name); }
          } catch (err) { failedUploads.push(file.name); }
        }
      }
      const finalLocation = category === 'General' ? location.trim() || 'General University Campus' : `[${deptNameInput}] - ${location.trim()}`;
      const newTicket = { roll_number: user?.rollNumber || 'FACULTY_ADMIN', category, location: finalLocation, description: description.trim(), status: 'UNDER_REVIEW', image_url: uploadedUrls[0] || null, image_urls: uploadedUrls.length > 0 ? uploadedUrls : null, upvotes: 0, comments: [], map_coordinates: selectedPosition ? { lat: selectedPosition[0], lng: selectedPosition[1] } : null };
      const { data: insertedTicket, error } = await supabase.from('tickets').insert([newTicket]).select().single();
      if (error) {
        // insert failed - clean up the images we already pushed to storage
        if (uploadedFileNames.length > 0) {
          try { await supabase.storage.from('issue-images').remove(uploadedFileNames); } catch (e) { console.error('Orphan cleanup failed:', e); }
        }
        throw new Error(error.message);
      }
      let finalMessage = '';
      if (failedUploads.length > 0) { finalMessage = `⚠️ Ticket reported, but ${failedUploads.length} image(s) failed to upload.`; }
      else { finalMessage = uploadedUrls.length > 0 ? `✓ Reported with ${uploadedUrls.length} image(s)!` : '✓ Issue reported!'; }
      triggerSnackbar(finalMessage);
      try {
        const deptMatch = finalLocation.match(/^\[([^\]]+)\]/);
        const department = deptMatch ? deptMatch[1] : null;
        const notificationsToInsert = [];
        if (department && category !== 'General') { notificationsToInsert.push({ recipient_identifier: department, recipient_type: 'hod', title: 'New Issue Reported', message: `${category} issue at ${location.trim() || 'General Campus'}`, ticket_id: insertedTicket.id, ticket_type: 'issue' }); }
        notificationsToInsert.push({ recipient_identifier: 'General', recipient_type: 'general_admin', title: 'New Issue Reported', message: `${category} issue at ${location.trim() || 'General Campus'}`, ticket_id: insertedTicket.id, ticket_type: 'issue' });
        if (notificationsToInsert.length > 0) await supabase.from('notifications').insert(notificationsToInsert);
      } catch (notifErr) { console.error('Notification error:', notifErr); }
      setShowReportModal(false); setDescription(''); setLocation(''); setIssueImages([]); setSelectedPosition(null);
      fetchTickets();
    } catch (error) { alert(`❌ Error: ${error.message || 'Something went wrong'}`); } finally { setSubmitting(false); }
  };

  const handleHarassmentSubmit = async (e) => {
    e.preventDefault();
    if (!h_fullName.trim() || !h_contact.trim() || !h_description.trim()) { alert('⚠️ Please fill out all required fields properly.'); return; }
    setSubmitting(true);
    try {
      let imageUrl = null;
      let uploadedHFileName = null;
      if (h_evidence) {
        if (!h_evidence.type.startsWith('image/')) throw new Error('Only image files are allowed for evidence.');
        if (h_evidence.size > 10 * 1024 * 1024) throw new Error('Evidence file size must be less than 10MB.');
        const fileName = `CONFIDENTIAL_${Date.now()}_${user?.rollNumber}.${h_evidence.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('issue-images').upload(fileName, h_evidence);
        if (uploadError) throw new Error('Failed to upload evidence. Please try again.');
        imageUrl = supabase.storage.from('issue-images').getPublicUrl(fileName).data.publicUrl;
        uploadedHFileName = fileName;
      }
      const secureDescription = `[STRICTLY CONFIDENTIAL COMPLAINT]\nComplainant Name: ${h_fullName.trim()}\nContact Number: ${h_contact.trim()}\n\n--- INCIDENT DETAILS ---\nAccused Profile: ${h_accusedType}\nAccused Name/Identities: ${h_accusedName.trim() || 'Not Provided'}\n\nDetailed Statement:\n${h_description.trim()}`;
      const newTicket = { roll_number: user?.rollNumber, category: 'Harassment', location: 'Confidential Disciplinary Cell', description: secureDescription, status: 'UNDER_REVIEW', image_url: imageUrl, upvotes: 0, comments: [] };
      const { data: insertedHarassment, error } = await supabase.from('tickets').insert([newTicket]).select().single();
      if (error) {
        if (uploadedHFileName) { try { await supabase.storage.from('issue-images').remove([uploadedHFileName]); } catch (e) { console.error(e); } }
        throw new Error(error.message);
      }
      try { await supabase.from('notifications').insert([{ recipient_identifier: 'Harassment', recipient_type: 'harassment_admin', title: 'New Confidential Report', message: `A new harassment complaint has been submitted`, ticket_id: insertedHarassment.id, ticket_type: 'harassment' }]); } catch (notifErr) { console.error('Notification error:', notifErr); }
      setShowHarassmentForm(false); setH_FullName(''); setH_Contact(''); setH_AccusedType('Student'); setH_AccusedName(''); setH_Description(''); setH_Evidence(null);
      triggerSnackbar('🛡️ Confidential report transmitted.'); fetchTickets();
    } catch (error) { alert(`❌ Error: ${error.message || 'Something went wrong'}`); } finally { setSubmitting(false); }
  };

  const markAsResolved = async (ticket, e) => {
    if (e) e.stopPropagation();
    const { error } = await supabase.from('tickets').update({ status: 'RESOLVED' }).eq('id', ticket.id);
    if (!error) {
      triggerSnackbar('Issue resolved!');
      if (selectedTicket && selectedTicket.id === ticket.id) setSelectedTicket({ ...selectedTicket, status: 'RESOLVED' });
      fetchTickets();
      if (!ticket.roll_number.includes('ADMIN') && ticket.category !== 'Harassment') {
        try { await supabase.functions.invoke('send-email', { body: { to_email: `${ticket.roll_number.toLowerCase()}@students.muet.edu.pk`, roll_number: ticket.roll_number, location: ticket.location, template_type: 'resolved' } }); } catch (err) { console.error(err); }
        if (ticket.roll_number && !ticket.roll_number.includes('ADMIN') && !ticket.roll_number.includes('FACULTY')) {
          try { await supabase.from('notifications').insert([{ recipient_identifier: ticket.roll_number, recipient_type: 'student', title: 'Ticket Resolved', message: `Your issue at ${ticket.location} has been marked as resolved`, ticket_id: ticket.id, ticket_type: 'issue' }]); } catch (notifErr) { console.error(notifErr); }
        }
      }
    }
  };

  const markHarassmentResolved = async (ticket, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Mark this confidential report as resolved?\n\nNote: No email will be sent (confidentiality).')) return;
    const { error } = await supabase.from('tickets').update({ status: 'RESOLVED' }).eq('id', ticket.id);
    if (!error) {
      triggerSnackbar('🛡️ Report marked as resolved.');
      if (selectedHarassment && selectedHarassment.id === ticket.id) setSelectedHarassment({ ...selectedHarassment, status: 'RESOLVED' });
      fetchTickets();
      if (ticket.roll_number) {
        try { await supabase.from('notifications').insert([{ recipient_identifier: ticket.roll_number, recipient_type: 'student', title: 'Confidential Report Update', message: 'Your confidential report has been reviewed and resolved', ticket_id: ticket.id, ticket_type: 'harassment' }]); } catch (notifErr) { console.error(notifErr); }
      }
    }
  };

  const handleDeleteTicket = async (ticketId, ticketOwnerRoll, e) => {
    if (e) e.stopPropagation();
    if (user?.rollNumber !== ticketOwnerRoll) return;
    if (!window.confirm("Delete this ticket?")) return;
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (!error) { fetchTickets(); triggerSnackbar('Ticket deleted.'); if (selectedTicket?.id === ticketId) setSelectedTicket(null); }
  };

  const handleToggleLike = async (ticket, e) => {
    if (e) e.stopPropagation();
    if (ticket.status === 'RESOLVED') return;
    const userIdentifier = isStudent && user ? user.rollNumber : (isHOD ? currentRole : (isGeneralAdmin ? 'General' : (isHarassmentAdmin ? 'Harassment' : null)));
    if (!userIdentifier) return;
    const { error } = await supabase.rpc('toggle_ticket_like', { ticket_id_param: ticket.id, user_roll_param: userIdentifier });
    if (!error) {
      const newLocal = localLikes.includes(ticket.id) ? localLikes.filter(id => id !== ticket.id) : [...localLikes, ticket.id];
      setLocalLikes(newLocal); localStorage.setItem('local_upvotes', JSON.stringify(newLocal)); fetchTickets();
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault(); if (!commentInput.trim()) return;
    const newComment = { id: Date.now(), sender: currentSenderName, text: commentInput.trim(), timestamp: new Date().toISOString() };
    const updatedComments = [...(selectedTicket.comments || []), newComment];
    const { error } = await supabase.rpc('update_ticket_comments', { ticket_id_param: selectedTicket.id, new_comments: updatedComments });
    if (!error) {
      setSelectedTicket(prev => ({ ...prev, comments: updatedComments }));
      setCommentInput('');
      fetchTickets();
      try {
        const notifs = [];
        const isStudentCommenting = isStudent;
        const ticketOwner = selectedTicket.roll_number;
        const deptMatch = selectedTicket.location?.match(/^\[([^\]]+)\]/);
        const department = deptMatch ? deptMatch[1] : null;
        if (isStudentCommenting) {
          if (department) { notifs.push({ recipient_identifier: department, recipient_type: 'hod', title: 'New Comment on Ticket', message: `Student ${ticketOwner} commented on ${selectedTicket.location}`, ticket_id: selectedTicket.id, ticket_type: 'issue' }); }
          notifs.push({ recipient_identifier: 'General', recipient_type: 'general_admin', title: 'New Comment on Ticket', message: `New comment on ticket #${selectedTicket.id.substring(0, 6)}`, ticket_id: selectedTicket.id, ticket_type: 'issue' });
        } else {
          if (ticketOwner && !ticketOwner.includes('ADMIN') && !ticketOwner.includes('FACULTY')) { notifs.push({ recipient_identifier: ticketOwner, recipient_type: 'student', title: 'New Reply from Admin', message: `Your ticket at ${selectedTicket.location} received a reply`, ticket_id: selectedTicket.id, ticket_type: 'issue' }); }
        }
        if (notifs.length > 0) await supabase.from('notifications').insert(notifs);
      } catch (notifErr) { console.error('Notification error:', notifErr); }
    }
  };

  const handleEditCommentSubmit = async (commentId) => {
    if (!editCommentText.trim()) return;
    const updatedComments = selectedTicket.comments.map(c => c.id === commentId ? { ...c, text: editCommentText.trim() } : c);
    const { error } = await supabase.rpc('update_ticket_comments', { ticket_id_param: selectedTicket.id, new_comments: updatedComments });
    if (!error) { setSelectedTicket(prev => ({ ...prev, comments: updatedComments })); setEditingCommentId(null); fetchTickets(); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this message?")) return;
    const updatedComments = selectedTicket.comments.filter(c => c.id !== commentId);
    const { error } = await supabase.rpc('update_ticket_comments', { ticket_id_param: selectedTicket.id, new_comments: updatedComments });
    if (!error) { setSelectedTicket(prev => ({ ...prev, comments: updatedComments })); fetchTickets(); }
  };

  const exportToCSV = () => {
    const { relevantTickets } = getAnalyticsData();
    const headers = ['Ticket ID', 'Category', 'Location', 'Status', 'Likes', 'Reported By', 'Date'];
    const rows = relevantTickets.map(t => `"${t.id}","${t.category}","${t.location}","${t.status}","${t.upvotes || 0}","${t.roll_number}","${new Date(t.created_at).toLocaleDateString()}"`);
    const link = document.createElement("a"); link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n'))); link.setAttribute("download", `MUET_${isHOD ? getDeptAbbrev(currentRole) : 'Campus'}_Report.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const ImageGallery = (props) => (
    <ImageGalleryImpl
      {...props}
      user={user}
      isStudent={isStudent}
      setLightboxImage={setLightboxImage}
      setSelectedTicket={setSelectedTicket}
      openTicketFresh={openTicketFresh}
    />
  );
  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -14px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulseRed { 0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35); } 50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); } }
        .anim-in { animation: fadeInUp .38s cubic-bezier(.21,.99,.44,1) both; }
        .anim-pop { animation: popIn .25s cubic-bezier(.21,.99,.44,1) both; }
        .anim-snack { animation: slideDown .3s cubic-bezier(.21,.99,.44,1) both; }
        .pulse-red { animation: pulseRed 2s infinite; }
        .scrollbar-slim::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-slim::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .glass-nav { backdrop-filter: blur(14px); }
        .leaflet-container { cursor: crosshair !important; }
      `}</style>

      {successMsg && (
        <div className="anim-snack fixed top-6 left-1/2 z-[999999] bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 border border-white/20">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          <span>{successMsg}</span>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999999] flex items-center justify-center p-4 anim-pop" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-red-500 text-white font-bold text-xl flex items-center justify-center border border-white/20"><Icons.X /></button>
          <img src={lightboxImage} alt="Evidence" className="max-w-full max-h-[90vh] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="fixed inset-0 w-screen max-w-[100vw] bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/40 font-sans text-gray-800 flex flex-col overflow-hidden">
        <nav className="glass-nav bg-gradient-to-r from-[#0a1a3f] via-[#122a63] to-[#1e3a8a] text-white shadow-xl px-4 md:px-6 py-3 flex justify-between items-center z-50 flex-shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10"><Icons.Menu /></button>
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 items-center justify-center shadow-lg ring-1 ring-white/20 hidden sm:flex">
              <img src="/Muet_logo.png" alt="MUET" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight">Smart Campus Facilities & Governance</h1>
              <p className="text-[9px] md:text-[10px] text-blue-200/90 tracking-wider font-medium">Mehran University of Engineering & Technology, Jamshoro</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {isStudent && user && (
              <button onClick={() => setShowReportModal(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[10px] md:text-xs font-bold px-3 md:px-4 py-2 rounded-xl shadow-lg transition-all flex items-center gap-1.5">
                <Icons.Plus /> File Issue
              </button>
            )}
            {!isStudent ? (
              <div className="hidden md:flex items-center gap-2.5">
                <span className={`text-xs px-3 py-1.5 rounded-xl border font-semibold backdrop-blur ${isHarassmentAdmin ? 'bg-red-500/20 text-red-100 border-red-400/30' : isGeneralAdmin ? 'bg-purple-500/20 text-purple-100 border-purple-400/30' : 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'}`}>
                  {getRoleDisplayName()}
                </span>
                <button onClick={handleLogout} className="text-xs bg-red-500/90 hover:bg-red-500 font-semibold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5">
                  <Icons.Logout /> Logout
                </button>
              </div>
            ) : user ? (
              <div className="hidden md:flex items-center gap-2.5">
                <span className="text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 font-mono font-semibold backdrop-blur">{user.rollNumber}</span>
                <button onClick={handleLogout} className="text-xs bg-red-500/90 hover:bg-red-500 font-semibold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5">
                  <Icons.Logout /> Logout
                </button>
              </div>
            ) : null}

            {(user || !isStudent) && (
              <div className="relative" ref={notifDropdownRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-all" aria-label="Notifications">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-[#0a1a3f] animate-pulse">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[9999] anim-pop">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div><h4 className="text-sm font-black text-gray-900">Notifications</h4><p className="text-[10px] text-gray-500 font-medium">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p></div>
                      {unreadCount > 0 && (<button onClick={markAllNotificationsAsRead} className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200">Mark all read</button>)}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto scrollbar-slim">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center"><div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3 text-2xl">🔔</div><p className="text-xs font-bold text-gray-600">No notifications yet</p><p className="text-[10px] text-gray-400 mt-1">You'll see updates here</p></div>
                      ) : (
                        notifications.map((notif) => (
                          <button key={notif.id} onClick={() => handleNotificationClick(notif)} className={`w-full text-left p-3.5 border-b border-gray-100 hover:bg-blue-50/50 transition-colors flex gap-3 items-start relative ${!notif.is_read ? 'bg-blue-50/30' : ''}`}>
                            {!notif.is_read && (<span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"></span>)}
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 text-base">{getNotificationIcon(notif.title)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-0.5"><p className={`text-xs truncate ${!notif.is_read ? 'font-black text-gray-900' : 'font-semibold text-gray-700'}`}>{notif.title}</p><span className="text-[9px] text-gray-400 whitespace-nowrap font-medium flex-shrink-0">{timeAgo(notif.created_at)}</span></div>
                              <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">{notif.message}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (<div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center"><span className="text-[10px] text-gray-400 font-medium">Showing last {notifications.length} notifications</span></div>)}
                  </div>
                )}
              </div>
            )}
            {isStudent && !user && (
              <select value="student" onChange={(e) => handleRoleSelection(e.target.value)} className="bg-white/10 text-white text-[10px] md:text-xs font-semibold px-2 md:px-3 py-2 rounded-xl border border-white/15 focus:outline-none cursor-pointer hover:bg-white/15">
                <option className="text-gray-900" value="student">Student Portal</option>
                <option className="text-gray-900" value="dept_admin">👨‍🏫 HOD Login</option>
                <option className="text-gray-900" value="General">🏢 Admin</option>
                <option className="text-gray-900" value="Harassment">🛡️ Cell</option>
              </select>
            )}
          </div>
        </nav>

        {isAuthChecking ? (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/40">
            <div className="text-center anim-in">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-2xl border border-gray-100 flex items-center justify-center mb-5 p-3 ring-1 ring-blue-900/5">
                <img src="/Muet_logo.png" alt="MUET" className="w-full h-full object-contain" />
              </div>
              <div className="w-8 h-8 mx-auto mb-4 rounded-full border-4 border-blue-100 border-t-blue-900 animate-spin"></div>
              <p className="text-sm font-bold text-gray-700">Smart Campus</p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">Restoring your session…</p>
            </div>
          </div>
        ) : isStudent && !user ? (
          <div className="flex-1 overflow-y-auto scrollbar-slim">
            {setupState.step === 'setting-up' ? (
              <div className="min-h-full flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 anim-in relative">
                  <button onClick={() => { setSetupState({ step: 'idle', rollNumber: '', department: '', deptAbbrev: '', batch: '', officialEmail: '' }); setSetupPassword(''); setSetupConfirmPassword(''); setSetupPersonalEmail(''); setErrorMsg(''); }} className="absolute top-4 left-4 flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-700 transition-colors">← Back to Login</button>
                  <div className="text-center mb-6 mt-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center mb-4 ring-8 ring-emerald-50"><Icons.Check /></div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1">Verified! 🎉</h2>
                    <p className="text-xs text-gray-500">Complete your account setup</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 space-y-2">
                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-gray-500 uppercase">Roll</span><span className="font-mono font-bold text-blue-900">{setupState.rollNumber}</span></div>
                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-gray-500 uppercase">Dept</span><span className="font-semibold text-blue-900 text-right">{setupState.department}</span></div>
                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-gray-500 uppercase">Official</span><span className="font-mono text-blue-900 text-right break-all">{setupState.officialEmail}</span></div>
                  </div>
                  <form onSubmit={handleCompleteSetup} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Set Password (min 6 chars) *</label>
                      <div className="relative">
                        <input type={showSetupPassword ? "text" : "password"} value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} placeholder="••••••••" className="w-full border border-gray-300 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required minLength={6} />
                        <button type="button" onClick={() => setShowSetupPassword(!showSetupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-700 p-1">{showSetupPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Confirm Password *</label>
                      <div className="relative">
                        <input type={showSetupConfirmPassword ? "text" : "password"} value={setupConfirmPassword} onChange={(e) => setSetupConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full border border-gray-300 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required minLength={6} />
                        <button type="button" onClick={() => setShowSetupConfirmPassword(!showSetupConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-700 p-1">{showSetupConfirmPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Personal Email (for password reset) *</label>
                      <input type="email" value={setupPersonalEmail} onChange={(e) => setSetupPersonalEmail(e.target.value)} placeholder="your.personal@gmail.com" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required />
                      <p className="text-[10px] text-gray-500 mt-1.5">💡 Forgot password link will come to this email</p>
                    </div>
                    {errorMsg && (<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2"><Icons.Warning /><span>{errorMsg}</span></div>)}
                    <button type="submit" disabled={isSettingUp} className="w-full py-3 bg-gradient-to-r from-blue-900 to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSettingUp ? <><Icons.Spinner /> Creating...</> : 'Complete Registration'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row items-stretch justify-center max-w-7xl mx-auto p-3 md:p-5 gap-4 lg:gap-5 lg:h-[calc(100vh-73px)]">
                <div className="flex-1 relative overflow-hidden rounded-3xl shadow-2xl min-h-[320px] lg:min-h-full">
                  <img src="/admin_block.png" alt="MUET Smart Campus" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-950/95 via-indigo-900/85 to-purple-900/75"></div>
                  <div className="relative z-10 h-full flex flex-col justify-center p-6 md:p-8 lg:p-10 text-white">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black leading-[1.15] tracking-tight mb-4">Next-Generation{' '}<span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">Campus Governance</span>{' '}& Facility Intelligence</h2>
                    <p className="text-blue-100/90 leading-relaxed text-sm md:text-base max-w-xl mb-5">Engineered to solve real-world infrastructure challenges at MUET Jamshoro. Our platform utilizes advanced AI OCR card verification, real-time ticket routing, map pinning, and automated email dispatching.</p>
                    <div className="flex flex-wrap gap-2">
                      {['AI OCR Verification', 'Email-Authenticated', 'Real-time Routing', 'Multi-Image Support'].map((f) => (<span key={f} className="text-[10px] md:text-[11px] font-semibold text-white bg-white/15 backdrop-blur border border-white/25 px-3 py-1.5 rounded-full shadow-sm">✓ {f}</span>))}
                    </div>
                  </div>
                </div>
                <div className="w-full lg:w-[400px] flex-shrink-0 flex items-center">
                  <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 md:p-6 anim-in relative overflow-hidden w-full">
                    <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-2xl opacity-70 pointer-events-none"></div>
                    {verificationState?.step === 'verifying' ? (
                      <div className="relative py-6 text-center"><div className="w-16 h-16 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-4"><Icons.Spinner /></div><h3 className="text-lg font-extrabold text-gray-900 mb-1">Verifying…</h3></div>
                    ) : verificationState?.step === 'sent' ? (
                      <div className="relative text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center mb-4 ring-8 ring-emerald-50"><Icons.Mail /></div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-1">Check your inbox</h3>
                        <p className="text-xs text-gray-500 mb-5">Verification link sent to your official MUET email:</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5"><p className="font-mono text-xs font-bold text-blue-900 break-all">{verificationState.email}</p></div>
                        <div className="space-y-2">
                          <button id="resend-btn" onClick={handleResendVerification} disabled={resending} className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2">{resending ? <><Icons.Spinner /> Sending…</> : 'Resend verification email'}</button>
                          {resendLockUntil && Date.now() < resendLockUntil && (
                            <p key={tick} className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-semibold text-center">
                              ⏳ 3 attempts completed. {Math.ceil((resendLockUntil - Date.now()) / 60000)} min after you can try 3 attempts again.
                            </p>
                          )}
                          <button onClick={() => { setVerificationState(null); setErrorMsg(''); }} className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-bold text-xs rounded-xl">Use a different card</button>
                        </div>
                      </div>
                    ) : verificationState?.step === 'sending' ? (
                      <div className="relative py-6 text-center"><div className="w-16 h-16 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-4"><Icons.Spinner /></div><h3 className="text-lg font-extrabold text-gray-900 mb-1">Sending email…</h3></div>
                    ) : showForgotPassword ? (
                      <div className="relative">
                        <div className="text-center mb-5">
                          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 flex items-center justify-center mb-3 ring-8 ring-amber-50"><Icons.Lock /></div>
                          <h3 className="text-xl font-extrabold text-gray-900 mb-1">Forgot Password?</h3>
                          <p className="text-xs text-gray-500">Reset link will be sent to your personal email</p>
                        </div>
                        {forgotState.step === 'sent' ? (
                          <div className="text-center">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4"><p className="text-xs font-bold text-emerald-900 mb-1">✅ Reset link sent!</p><p className="text-[11px] text-emerald-700">Check: <strong className="font-mono break-all">{forgotState.email}</strong></p></div>
                            <button onClick={() => { setShowForgotPassword(false); setForgotState({ step: 'idle', roll: '', email: '' }); setForgotRollNumber(''); setErrorMsg(''); }} className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Back to Login</button>
                          </div>
                        ) : (
                          <form onSubmit={handleStudentForgotPassword} className="space-y-4">
                            <div><label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Roll Number</label><input type="text" value={forgotRollNumber} onChange={(e) => setForgotRollNumber(e.target.value.toUpperCase())} placeholder="e.g. 23CS042" className="w-full border border-gray-300 rounded-xl p-3 text-sm font-mono uppercase focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required /></div>
                            {errorMsg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2"><Icons.Warning /><span>{errorMsg}</span></div>}
                            <div className="flex gap-3">
                              <button type="button" onClick={() => { setShowForgotPassword(false); setForgotRollNumber(''); setErrorMsg(''); }} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Back</button>
                              <button type="submit" disabled={isSendingReset} className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">{isSendingReset ? <><Icons.Spinner /> Sending...</> : 'Send Reset Link'}</button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <h3 className="text-lg font-extrabold text-gray-900 mb-0.5">Student Login</h3>
                        <p className="text-[11px] text-gray-500 mb-3.5">Login with your roll number and password</p>
                        <form onSubmit={handleStudentLogin} className="space-y-2.5">
                          <input type="text" value={studentLoginRoll} onChange={(e) => setStudentLoginRoll(e.target.value.toUpperCase())} placeholder="Roll Number (e.g. 23CS042)" className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required disabled={isStudentLoggingIn} />
                          <div className="relative">
                            <input type={showLoginPassword ? "text" : "password"} value={studentLoginPassword} onChange={(e) => setStudentLoginPassword(e.target.value)} placeholder="Password" className="w-full border border-gray-300 rounded-xl p-2.5 pr-11 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required disabled={isStudentLoggingIn} />
                            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-700 p-1">{showLoginPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                          </div>
                          <div className="flex justify-end -mt-1"><button type="button" onClick={() => { setShowForgotPassword(true); setErrorMsg(''); }} className="text-[10px] text-blue-700 hover:text-blue-900 font-bold">Forgot password?</button></div>
                          <button type="submit" disabled={isStudentLoggingIn || !studentLoginRoll.trim() || !studentLoginPassword.trim()} className="w-full py-2.5 bg-gradient-to-r from-blue-900 to-indigo-800 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">{isStudentLoggingIn ? <><Icons.Spinner /> Logging in...</> : 'Login'}</button>
                        </form>
                        <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">OR</span><div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div></div>
                        <h4 className="text-xs font-black text-gray-900 mb-0.5">New Student? Register</h4>
                        <p className="text-[10px] text-gray-500 mb-2">Upload your MUET ID card once</p>
                        <label className="border-2 border-dashed border-gray-300 hover:border-blue-700 hover:bg-blue-50/50 transition-all rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer bg-gray-50 group">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Icons.Upload /></div>
                          <div className="text-left"><span className="text-xs font-bold text-blue-900 block">Browse or Drop ID Card</span><span className="text-[10px] text-gray-400">Clear JPG / PNG format</span></div>
                          <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                        </label>
                        {scanning && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[11px] font-semibold text-blue-900 mb-1"><span>Running OCR...</span><span>{scanProgress}%</span></div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-blue-700 to-indigo-500 h-full transition-all" style={{ width: `${scanProgress}%` }}></div></div>
                          </div>
                        )}
                      </div>
                    )}
                    {errorMsg && verificationState === null && !showForgotPassword && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2"><Icons.Warning /><span>{errorMsg}</span></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden relative max-w-[1500px] w-full mx-auto min-w-0">
            <aside className={`bg-white/95 border-r border-gray-200 flex flex-col z-40 transition-all duration-300 flex-shrink-0 h-full overflow-y-auto scrollbar-slim absolute md:relative shadow-xl ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full border-none opacity-0'}`}>
              <div className="p-4 space-y-2 min-w-[256px]">
                <div className="flex justify-between items-center mb-2">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Navigation</div>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-red-500 p-2 md:hidden"><Icons.X /></button>
                </div>
                {isStudent && (
                  <>
                    <button onClick={() => { setActiveSidebarTab('dept_home'); setShowHarassmentForm(false); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'dept_home' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50'}`}><Icons.Building /> My Department Portal</button>
                    <button onClick={() => { setActiveSidebarTab('general'); setShowHarassmentForm(false); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'general' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50'}`}><Icons.Globe /> General University Feed</button>
                    <button onClick={() => { setActiveSidebarTab('harassment'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'harassment' ? 'bg-gradient-to-r from-red-800 to-rose-700 text-white shadow-lg' : 'text-red-700 hover:bg-red-50'}`}><Icons.Shield /> Harassment & Discipline</button>
                    <button onClick={() => { setActiveSidebarTab('mytickets'); setShowHarassmentForm(false); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'mytickets' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50'}`}><Icons.User /> My Submission History</button>
                    <button onClick={() => { setActiveSidebarTab('about'); setShowHarassmentForm(false); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'about' ? 'bg-gradient-to-r from-indigo-800 to-purple-800 text-white shadow-lg' : 'text-gray-600 hover:bg-indigo-50'}`}><Icons.Info /> About Us</button>
                  </>
                )}
                {isHOD && (
                  <>
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl text-xs font-bold text-emerald-900 mb-2 border border-emerald-200 flex items-center gap-2"><Icons.Building /> {getDeptAbbrev(currentRole)} HOD</div>
                    <button onClick={() => { setActiveSidebarTab('analytics'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'analytics' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50'}`}><Icons.Chart /> Department Analytics</button>
                    <button onClick={() => { setActiveSidebarTab('qr_generator'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'qr_generator' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg' : 'text-gray-600 hover:bg-blue-50'}`}><Icons.Map /> QR Code Generator</button>
                  </>
                )}
                {isGeneralAdmin && (
                  <>
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl text-xs font-bold text-purple-900 mb-2 border border-purple-200 flex items-center gap-2"><Icons.Globe /> General Admin</div>
                    <button onClick={() => { setActiveSidebarTab('analytics'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'analytics' ? 'bg-gradient-to-r from-purple-900 to-indigo-800 text-white shadow-lg' : 'text-gray-600 hover:bg-purple-50'}`}><Icons.Chart /> Campus Analytics</button>
                  </>
                )}
                {isHarassmentAdmin && (
                  <>
                    <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl text-xs font-bold text-red-900 mb-2 border border-red-200 flex items-center gap-2"><Icons.Shield /> Confidential Cell</div>
                    <button onClick={() => { setActiveSidebarTab('harassment_reports'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${activeSidebarTab === 'harassment_reports' ? 'bg-gradient-to-r from-red-900 to-rose-800 text-white shadow-lg' : 'text-red-700 hover:bg-red-50'}`}><Icons.Shield /> Confidential Reports</button>
                  </>
                )}
                {user && <button onClick={handleLogout} className="md:hidden w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"><Icons.Logout /> Logout</button>}
                {!isStudent && <button onClick={handleLogout} className="md:hidden w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"><Icons.Logout /> Logout</button>}
              </div>
            </aside>

            <main className="flex-1 h-full w-full relative bg-transparent flex flex-col overflow-hidden">
              {(activeSidebarTab === 'dept_home' && isStudent) && (
                <>
                  <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 pb-2">
                    <div className="rounded-3xl shadow-xl relative overflow-hidden text-white min-h-[160px] md:min-h-[200px] ring-1 ring-blue-900/10 p-6 md:p-8 md:pr-[260px]" style={{ backgroundImage: getDeptBannerStyle(user?.deptAbbrev).bg }}>
                      <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 z-0">
                        <DeptBannerImage deptAbbrev={user?.deptAbbrev} />
                      </div>
                      <div className="relative z-10">
                        <span className="inline-block whitespace-nowrap bg-white/95 text-blue-900 text-[10px] font-black px-3 py-1 rounded-full uppercase">Official Department Portal</span>
                        <h2 className="text-xl md:text-3xl font-black mt-3 leading-tight" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>{fullUserDepartment}</h2>
                        <p className="text-xs md:text-sm text-blue-50/90 mt-2 font-medium" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>Welcome to the official {fullUserDepartment} Complaint Portal.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 py-3 flex justify-between items-center bg-white/70 border-b border-gray-200">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-700 to-indigo-500"></span>Active Department Issues</h3>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl"><option value="most_liked">🔥 Most Liked</option><option value="newest">✨ Newest First</option></select>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-slim px-4 md:px-6 lg:px-8 py-4">
                    <div className="space-y-4 pb-10">
                      {isLoadingTickets ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><Icons.Spinner /><p className="text-sm font-bold text-gray-700 mt-2">Loading tickets...</p></div>
                      ) : ticketsError ? (
                        <div className="bg-red-50 rounded-3xl border border-red-200 p-14 text-center anim-in"><Icons.Warning /><p className="text-sm font-bold text-red-700 mt-2">Failed to load tickets. Please check your internet connection.</p><button onClick={() => fetchTickets(true)} className="mt-3 text-xs bg-red-600 text-white px-4 py-2 rounded-lg font-bold">Retry</button></div>
                      ) : sortedTickets.filter(t => t.status !== 'RESOLVED' && t.category !== 'Harassment' && (t.location?.toLowerCase().includes(fullUserDepartment.toLowerCase()) || (user.deptAbbrev && t.category === user.deptAbbrev))).length === 0 ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3"><Icons.Document /></div><p className="text-sm font-bold text-gray-700">No active tickets</p></div>
                      ) : (
                        sortedTickets.filter(t => t.status !== 'RESOLVED' && t.category !== 'Harassment' && (t.location?.toLowerCase().includes(fullUserDepartment.toLowerCase()) || (user.deptAbbrev && t.category === user.deptAbbrev))).map(t => {
                          const isOwner = user?.rollNumber === t.roll_number;
                          return (
                            <div key={t.id} onClick={() => openTicketFresh(t)} className="anim-in bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start gap-6 hover:border-blue-300 cursor-pointer transition-all group">
                              <button onClick={(e) => handleToggleLike(t, e)} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border min-w-[62px] ${localLikes.includes(t.id) ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-red-400'}`}>
                                <svg className="w-6 h-6" fill={localLikes.includes(t.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                <span className="font-bold text-sm">{t.upvotes || 0}</span>
                              </button>
                              <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-bold text-base text-gray-900">{t.location}</h4>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isOwner ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>{isOwner ? '👤 Your Report' : '👥 Anonymous Student'}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 mb-2 whitespace-pre-line">{t.description}</p>
                                <StatusPipeline status={t.status} />
                                <ImageGallery ticket={t} />
                              </div>
                              <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto mt-4 md:mt-0">
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-lg ${t.status === 'RESOLVED' ? 'text-green-800 bg-green-100' : 'text-orange-700 bg-orange-100'}`}>{t.status}</span>
                                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-200 group-hover:bg-blue-900 group-hover:text-white transition-all flex items-center gap-1.5">{isOwner ? <><Icons.Chat /> Open Chat</> : <><Icons.Eye /> View Details</>}</span>
                                {isOwner && (<button onClick={(e) => handleDeleteTicket(t.id, t.roll_number, e)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 mt-1 flex items-center gap-1.5"><Icons.Trash /> Delete</button>)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

              {(activeSidebarTab === 'general' && isStudent) && (
                <>
                  <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 pt-4 md:pt-6 pb-2">
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                      <span className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Universal University Feed</span>
                      <h2 className="text-xl md:text-2xl font-black text-gray-900 mt-2">Campus-Wide Infrastructure Grievances</h2>
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 py-3 flex justify-between items-center bg-white/70 border-b border-gray-200">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-orange-500 to-amber-400"></span>Active General Issues</h3>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl"><option value="most_liked">🔥 Most Liked</option><option value="newest">✨ Newest First</option></select>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-slim px-4 md:px-6 lg:px-8 py-4">
                    <div className="space-y-4 pb-10">
                      {isLoadingTickets ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><Icons.Spinner /><p className="text-sm font-bold text-gray-700 mt-2">Loading tickets...</p></div>
                      ) : ticketsError ? (
                        <div className="bg-red-50 rounded-3xl border border-red-200 p-14 text-center anim-in"><Icons.Warning /><p className="text-sm font-bold text-red-700 mt-2">Failed to load tickets. Please check your internet connection.</p><button onClick={() => fetchTickets(true)} className="mt-3 text-xs bg-red-600 text-white px-4 py-2 rounded-lg font-bold">Retry</button></div>
                      ) : sortedTickets.filter(t => t.status !== 'RESOLVED' && t.category === 'General').length === 0 ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3"><Icons.Globe /></div><p className="text-sm font-bold text-gray-700">No general issues</p></div>
                      ) : (
                        sortedTickets.filter(t => t.status !== 'RESOLVED' && t.category === 'General').map(t => {
                          const isOwner = user?.rollNumber === t.roll_number;
                          return (
                            <div key={t.id} onClick={() => openTicketFresh(t)} className="anim-in bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start gap-6 hover:border-blue-300 cursor-pointer transition-all group">
                              <button onClick={(e) => handleToggleLike(t, e)} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border min-w-[62px] ${localLikes.includes(t.id) ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <svg className="w-6 h-6" fill={localLikes.includes(t.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                <span className="font-bold text-sm">{t.upvotes || 0}</span>
                              </button>
                              <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-bold text-base text-gray-900">{t.location}</h4>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isOwner ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>{isOwner ? '👤 Your Report' : '👥 Anonymous Student'}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 mb-2 whitespace-pre-line">{t.description}</p>
                                <StatusPipeline status={t.status} />
                                <ImageGallery ticket={t} />
                              </div>
                              <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto mt-4 md:mt-0">
                                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-200 group-hover:bg-blue-900 group-hover:text-white transition-all flex items-center gap-1.5">{isOwner ? <><Icons.Chat /> Open Chat</> : <><Icons.Eye /> View Details</>}</span>
                                {isOwner && (<button onClick={(e) => handleDeleteTicket(t.id, t.roll_number, e)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 mt-1 flex items-center gap-1.5"><Icons.Trash /> Delete</button>)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

              {(activeSidebarTab === 'harassment' && isStudent) && (
                <>
                  {!showHarassmentForm ? (
                    <>
                      <div className="flex-shrink-0 p-4 md:p-6 lg:p-8 pb-0">
                        <div className="bg-gradient-to-br from-red-900 via-rose-900 to-red-800 text-white rounded-3xl p-6 md:p-8 shadow-xl">
                          <span className="bg-white/15 text-red-100 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Confidential Mechanism</span>
                          <h2 className="text-2xl md:text-3xl font-black mt-3">University Harassment & Discipline Cell</h2>
                          <p className="text-xs md:text-sm text-red-100/80 mt-2 max-w-2xl">Strictly confidential channel reviewed only by the disciplinary committee.</p>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto scrollbar-slim p-4 md:p-6 lg:p-8 pt-4 md:pt-6">
                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 max-w-2xl anim-in">
                          <h3 className="text-base font-bold text-gray-900 mb-2">Direct Committee Submission</h3>
                          <p className="text-xs text-gray-500 leading-relaxed mb-4">Submit a secure complaint directly to the disciplinary cell.</p>
                          <button onClick={() => setShowHarassmentForm(true)} className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg flex items-center gap-2"><Icons.Shield /> Open Secure Form</button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 overflow-y-auto scrollbar-slim p-4 md:p-6 lg:p-8">
                      <div className="bg-white rounded-3xl border border-red-200 shadow-2xl overflow-hidden anim-in max-w-4xl mx-auto">
                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 p-6 flex justify-between items-start">
                          <div><h3 className="text-2xl font-black text-red-900">Confidential Report</h3><p className="text-xs text-red-700/70 mt-1 font-medium">All fields required</p></div>
                          <button onClick={() => setShowHarassmentForm(false)} className="bg-white text-gray-500 font-bold px-4 py-2 rounded-xl text-xs border">Cancel</button>
                        </div>
                        <form onSubmit={handleHarassmentSubmit} className="p-6 md:p-8 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Roll (Verified)</label><input type="text" value={user.rollNumber} disabled className="w-full bg-gray-100 border rounded-xl p-3 text-sm font-mono text-gray-500" /></div>
                            <div><label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5">Department</label><input type="text" value={fullUserDepartment} disabled className="w-full bg-gray-100 border rounded-xl p-3 text-sm font-semibold text-gray-500" /></div>
                            <div><label className="block text-[10px] font-bold uppercase text-gray-700 mb-1.5">Your Full Name *</label><input type="text" value={h_fullName} onChange={(e) => setH_FullName(e.target.value)} required placeholder="Full name" className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-red-500" /></div>
                            <div><label className="block text-[10px] font-bold uppercase text-gray-700 mb-1.5">Contact *</label><input type="tel" value={h_contact} onChange={(e) => setH_Contact(e.target.value)} required placeholder="03XX-XXXXXXX" className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-red-500" /></div>
                          </div>
                          <div className="border-t pt-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-red-600"></span>Accused Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div><label className="block text-[10px] font-bold uppercase text-gray-700 mb-1.5">Status *</label><select value={h_accusedType} onChange={(e) => setH_AccusedType(e.target.value)} className="w-full border rounded-xl p-3 text-sm"><option value="Student">Fellow Student</option><option value="Faculty / Teacher">Faculty / Teacher</option><option value="Staff / Admin">Staff / Admin</option><option value="Outsider / Unknown">Outsider</option></select></div>
                              <div><label className="block text-[10px] font-bold uppercase text-gray-700 mb-1.5">Name (If Known)</label><input type="text" value={h_accusedName} onChange={(e) => setH_AccusedName(e.target.value)} placeholder="Name, Roll No, Designation" className="w-full border rounded-xl p-3 text-sm" /></div>
                            </div>
                          </div>
                          <div className="border-t pt-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-red-600"></span>Incident Statement</h4>
                            <textarea value={h_description} onChange={(e) => setH_Description(e.target.value)} required rows="5" placeholder="Chronological account..." className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-red-500"></textarea>
                            <div className="mt-4">
                              <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1.5">Evidence (Optional - Image Only)</label>
                              <input type="file" accept="image/*" onChange={(e) => setH_Evidence(e.target.files[0])} className="w-full border border-dashed rounded-xl p-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-gray-100 cursor-pointer" />
                            </div>
                          </div>
                          <div className="pt-4 flex justify-end">
                            <button type="submit" disabled={submitting} className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg disabled:opacity-50">
                              {submitting ? 'Transmitting...' : 'Submit Confidential Report'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(activeSidebarTab === 'mytickets' && isStudent) && (
                <>
                  <div className="flex-shrink-0 p-4 md:p-6 lg:p-8 pb-0"><h2 className="text-2xl font-black text-gray-900">My Submitted Complaints</h2></div>
                  <div className="flex-1 overflow-y-auto scrollbar-slim p-4 md:p-6 lg:p-8 pt-4 md:pt-6">
                    <div className="space-y-4 pb-10">
                      {isLoadingTickets ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><Icons.Spinner /><p className="text-sm font-bold text-gray-700 mt-2">Loading your submissions...</p></div>
                      ) : tickets.filter(t => t.roll_number === user.rollNumber).length === 0 ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3"><Icons.Document /></div><p className="text-sm font-bold text-gray-700">No submissions yet</p></div>
                      ) : (
                        tickets.filter(t => t.roll_number === user.rollNumber).map(t => (
                          <div key={t.id} onClick={() => openTicketFresh(t)} className="anim-in bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start gap-6 hover:border-blue-300 cursor-pointer transition-all group">
                            <div className="flex-1 w-full">
                              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-900">{t.category}</span>
                              <h4 className="font-bold text-base text-gray-900 mt-2">{t.location}</h4>
                              <p className="text-xs text-gray-600 mt-1 mb-2 whitespace-pre-line truncate max-w-xl">{t.description}</p>
                              <StatusPipeline status={t.status} />
                              <ImageGallery ticket={t} />
                            </div>
                            <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto mt-4 md:mt-0">
                              <span className={`text-[10px] font-bold px-3 py-1 rounded-lg ${t.status === 'RESOLVED' ? 'text-green-800 bg-green-100' : 'text-orange-700 bg-orange-100'}`}>{t.status}</span>
                              <span className="text-xs font-bold text-blue-900 bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-200 group-hover:bg-blue-900 group-hover:text-white transition-all flex items-center gap-1.5"><Icons.Chat /> Open Chat</span>
                              <button onClick={(e) => handleDeleteTicket(t.id, t.roll_number, e)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 mt-1 flex items-center gap-1.5"><Icons.Trash /> Delete</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {(activeSidebarTab === 'about' && isStudent) && (
                <div className="flex-1 overflow-y-auto scrollbar-slim">
                  <div className="px-4 md:px-6 lg:px-8 pt-4 md:pt-6 pb-4">
                    <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ring-1 ring-white/20 mb-4"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>About This Platform</div>
                        <h1 className="text-3xl md:text-4xl font-black leading-tight mb-3">Smart Campus<br /><span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">Facilities & Governance</span></h1>
                        <p className="text-sm md:text-base text-blue-100 leading-relaxed max-w-3xl font-medium">A next-generation digital platform engineered at Mehran University of Engineering & Technology, Jamshoro, to bridge the gap between students and campus administration.</p>
                        <div className="flex flex-wrap gap-2 mt-5">
                          {['AI OCR Verified', 'Real-Time Tracking', 'Confidential Reporting', 'Automated Notifications'].map((f) => (<span key={f} className="text-[10px] font-bold text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-full backdrop-blur">✓ {f}</span>))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 md:px-6 lg:px-8 pb-10 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm anim-in">
                      <div className="flex items-start gap-4 mb-4"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-800 flex items-center justify-center flex-shrink-0"><Icons.Info /></div><div><h2 className="text-lg md:text-xl font-black text-gray-900 mb-2">What Is This Platform?</h2><p className="text-sm text-gray-700 leading-relaxed">Smart Campus is a <strong>unified digital gateway</strong> that empowers students to report infrastructure issues (broken ACs, faulty lights, plumbing problems, Wi-Fi dead zones, furniture damage) directly to the responsible department. Powered by AI-driven ID verification and real-time communication, it ensures every complaint reaches the right authority instantly — and gets resolved transparently.</p></div></div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm anim-in">
                      <div className="flex items-start gap-4 mb-4"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center flex-shrink-0"><Icons.Lightbulb /></div><div><h2 className="text-lg md:text-xl font-black text-gray-900 mb-2">Why Was It Built?</h2><p className="text-sm text-gray-700 leading-relaxed mb-3">Traditional complaint systems in universities are <strong>slow, unorganized, and lack accountability</strong>. Students file complaints on paper, they get lost, and no one knows the status. We built this platform to solve three critical problems:</p><ul className="space-y-2 text-sm text-gray-700"><li className="flex items-start gap-2"><span className="text-red-500 font-bold flex-shrink-0">●</span><span><strong>No transparency:</strong> Students never knew if their complaint was even read. Now every ticket has a live status.</span></li><li className="flex items-start gap-2"><span className="text-orange-500 font-bold flex-shrink-0">●</span><span><strong>Wrong routing:</strong> Complaints went to the wrong department. Now AI automatically routes them correctly.</span></li><li className="flex items-start gap-2"><span className="text-yellow-500 font-bold flex-shrink-0">●</span><span><strong>No accountability:</strong> No one tracked response time. Now HODs see analytics and resolution rates.</span></li></ul></div></div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm anim-in">
                      <div className="flex items-start gap-4 mb-4"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-purple-800 flex items-center justify-center flex-shrink-0"><Icons.Sparkles /></div><div className="w-full"><h2 className="text-lg md:text-xl font-black text-gray-900 mb-4">What's In It For You?</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { title: '30-Second Reporting', desc: 'Snap a photo, describe the issue, submit. Done.' },
                          { title: 'Live Status Tracking', desc: 'See exactly when your issue moves from Reported → Assigned → Resolved.' },
                          { title: 'Direct HOD Chat', desc: 'Chat one-on-one with the department HOD until issue is fixed.' },
                          { title: 'Confidential Complaints', desc: 'Harassment & discipline reports go to a secure channel only.' },
                          { title: 'Community Voice', desc: 'Upvote issues you face too. High-upvote issues get priority attention.' },
                          { title: 'Email Notifications', desc: 'Get notified when your ticket is resolved. No need to keep checking.' },
                        ].map((b, i) => (<div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all"><div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5"><Icons.Check /></div><div><p className="text-xs font-bold text-gray-900">{b.title}</p><p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{b.desc}</p></div></div>))}
                      </div></div></div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm anim-in">
                      <div className="flex items-start gap-4 mb-5"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 flex items-center justify-center flex-shrink-0"><Icons.Clipboard /></div><div className="w-full"><h2 className="text-lg md:text-xl font-black text-gray-900 mb-4">How To Use — Step By Step</h2><div className="space-y-3">
                        {[
                          { step: '01', title: 'Verify Your Identity', desc: 'On first visit, upload a clear photo of your MUET ID card. Our AI scans it and verifies your roll number automatically.', color: 'from-blue-500 to-indigo-500' },
                          { step: '02', title: 'Confirm Via Email', desc: 'Check your student email (@students.muet.edu.pk) for a verification link. Click it to activate your account.', color: 'from-emerald-500 to-teal-500' },
                          { step: '03', title: 'Report an Issue', desc: 'Click "+ File Issue" in the top bar. Choose category, location, describe the problem, attach up to 5 photos, and pin the exact location on map.', color: 'from-orange-500 to-amber-500' },
                          { step: '04', title: 'Track Live Status', desc: 'Go to "My Submission History" to see your tickets. Watch as status moves from Reported → Assigned → Resolved.', color: 'from-purple-500 to-pink-500' },
                          { step: '05', title: 'Chat With HOD', desc: 'Click any ticket to open the secure chat. Communicate directly with the responsible department until it\'s fixed.', color: 'from-cyan-500 to-blue-500' },
                          { step: '06', title: 'Get Notified', desc: 'When your issue is resolved, you\'ll receive an automatic email confirmation. No follow-up calls needed!', color: 'from-rose-500 to-red-500' },
                        ].map((item, i) => (<div key={i} className="flex gap-4 p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-md`}>{item.step}</div><div><p className="text-sm font-bold text-gray-900 mb-1">{item.title}</p><p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p></div></div>))}
                      </div></div></div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 md:p-8 shadow-xl anim-in relative overflow-hidden">
                      <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="relative">
                        <div className="flex items-start gap-4 mb-5"><div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0 ring-1 ring-emerald-400/30"><Icons.Shield /></div><div><h2 className="text-lg md:text-xl font-black mb-2">Your Privacy Is Protected</h2><p className="text-sm text-slate-300 leading-relaxed mb-4">We take your privacy seriously. Here's how we keep your data safe:</p></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { title: 'Encrypted Storage', desc: 'All data is stored in Supabase with encrypted connections and row-level security.' },
                            { title: 'Private Images', desc: 'Attached photos are visible only to YOU and the HOD — never to other students.' },
                            { title: 'Confidential Reports', desc: 'Harassment complaints are strictly reviewed only by the disciplinary cell.' },
                            { title: 'No Third-Party Sharing', desc: 'Your data never leaves MUET\'s digital ecosystem. No ads, no tracking.' },
                          ].map((item, i) => (<div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"><div className="w-6 h-6 rounded-md bg-emerald-500/30 text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5"><Icons.Check /></div><div><p className="text-xs font-bold text-white">{item.title}</p><p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p></div></div>))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm anim-in text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4 ring-4 ring-blue-50"><img src="/Muet_logo.png" alt="MUET" className="w-10 h-10 object-contain" /></div>
                      <h3 className="text-base font-black text-gray-900 mb-1">Mehran University of Engineering & Technology</h3>
                      <p className="text-xs text-gray-500 font-medium mb-4">Jamshoro, Sindh, Pakistan — 76062</p>
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <p className="text-[11px] text-gray-500 leading-relaxed">This platform was developed by <strong>Ahmedraza (23CS042)</strong> to demonstrate next-generation campus governance using AI, real-time databases, and modern web technologies.</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {['React + Vite', 'Supabase', 'Tesseract OCR', 'Edge Functions', 'Leaflet Maps', 'Recharts'].map((tech) => (<span key={tech} className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">{tech}</span>))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-3xl p-6 md:p-8 shadow-xl anim-in relative overflow-hidden">
                      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="relative flex flex-col md:flex-row items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 ring-1 ring-white/20"><Icons.Mail /></div>
                        <div className="flex-1 text-center md:text-left"><h3 className="text-base md:text-lg font-black mb-1">Need Help or Have Feedback?</h3><p className="text-xs text-blue-100 leading-relaxed">Facing any issue with the platform? Want to suggest a new feature? We'd love to hear from you.</p></div>
                        <a href="mailto:support@smartcampus.muet.edu.pk" className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition-all whitespace-nowrap hover:scale-[1.03]">Contact Support →</a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeSidebarTab === 'analytics' && (isHOD || isGeneralAdmin)) && (
                <>
                  <div className="flex-shrink-0 p-4 md:p-6 lg:p-8 pb-0">
                    <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl shadow-sm border ${isGeneralAdmin ? 'bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-purple-200' : 'bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/60 border-blue-100'}`}>
                      <div><h2 className="text-lg md:text-2xl font-black text-gray-900">{isGeneralAdmin ? '🏢 Campus Analytics' : '📊 Department Analytics'}</h2><p className="text-xs text-gray-500 mt-1 font-medium">{isGeneralAdmin ? 'All departments overview' : <>Scope: <span className="text-blue-900 font-bold">{currentRole}</span></>}</p></div>
                      <button onClick={exportToCSV} className={`text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 ${isGeneralAdmin ? 'bg-gradient-to-r from-purple-900 to-indigo-800' : 'bg-gradient-to-r from-blue-900 to-indigo-800'}`}><Icons.Download /> Export CSV</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-slim p-4 md:p-6 lg:p-8 pt-4 md:pt-6">
                    {isLoadingTickets ? (
                      <div className="flex-1 flex items-center justify-center p-20"><Icons.Spinner /><span className="ml-3 font-bold text-gray-600">Loading analytics...</span></div>
                    ) : (() => {
                      const { categoryData, statusData, deptData, last7Days, totalTickets, resolved, pending, resolutionRate } = getAnalyticsData();
                      return (
                        <div className="space-y-5 pb-10">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><div className="flex items-center justify-between mb-3"><span className="text-[10px] font-bold uppercase text-gray-400">Total Tickets</span><div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center"><Icons.Document /></div></div><p className="text-3xl font-black text-gray-900">{totalTickets}</p><p className="text-[10px] text-gray-500 mt-1">All time</p></div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><div className="flex items-center justify-between mb-3"><span className="text-[10px] font-bold uppercase text-gray-400">Resolved</span><div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Icons.Check /></div></div><p className="text-3xl font-black text-emerald-700">{resolved}</p><p className="text-[10px] text-gray-500 mt-1">Closed</p></div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><div className="flex items-center justify-between mb-3"><span className="text-[10px] font-bold uppercase text-gray-400">Pending</span><div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center"><Icons.Gear /></div></div><p className="text-3xl font-black text-orange-700">{pending}</p><p className="text-[10px] text-gray-500 mt-1">Awaiting</p></div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><div className="flex items-center justify-between mb-3"><span className="text-[10px] font-bold uppercase text-gray-400">Rate</span><div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center"><Icons.Chart /></div></div><p className="text-3xl font-black text-indigo-700">{resolutionRate}%</p><p className="text-[10px] text-gray-500 mt-1">Efficiency</p></div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-700 to-indigo-500"></span>Tickets by Category</h3>{categoryData.length === 0 ? <div className="h-64 flex items-center justify-center text-gray-400 text-xs">No data</div> : (<ResponsiveContainer width="100%" height={260}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3} label={(e) => `${e.name}: ${e.value}`} labelLine={false} style={{ fontSize: '11px', fontWeight: 600 }}>{categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}</Pie><Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} /></PieChart></ResponsiveContainer>)}</div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500"></span>Resolution Status</h3><ResponsiveContainer width="100%" height={260}><BarChart data={statusData} barSize={60}><XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#6b7280' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} /><Bar dataKey="value" radius={[10, 10, 0, 0]}>{statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Bar></BarChart></ResponsiveContainer></div>
                          </div>
                          {isGeneralAdmin && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-orange-500 to-amber-500"></span>Top Departments by Volume</h3>{deptData.length === 0 ? <div className="h-64 flex items-center justify-center text-gray-400 text-xs">No data</div> : (<ResponsiveContainer width="100%" height={260}><BarChart data={deptData} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} /><Bar dataKey="value" radius={[0, 10, 10, 0]}>{deptData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}</Bar></BarChart></ResponsiveContainer>)}</div>
                          )}
                          <div className="bg-white rounded-2xl p-5 shadow-sm border anim-in"><h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-purple-500 to-pink-500"></span>Weekly Ticket Trend</h3><ResponsiveContainer width="100%" height={260}><BarChart data={last7Days} barSize={32}><XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} /><Bar dataKey="tickets" fill="#8b5cf6" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div>
                          <div className="bg-white rounded-2xl p-5 shadow-sm border">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4"><span className="w-1.5 h-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500"></span>Tickets Requiring Action <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{pending}</span></h3>
                            <div className="space-y-3">
                              {(() => {
                                const actionTickets = isGeneralAdmin ? nonHarassmentTickets : nonHarassmentTickets.filter(t => ((t.location && t.location.includes(currentRole)) || t.category === currentRole));
                                const pendingAction = actionTickets.filter(t => t.status !== 'RESOLVED');
                                if (pendingAction.length === 0) return (<div className="py-10 text-center"><div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Icons.Check /></div><p className="text-sm font-bold text-gray-700">All caught up!</p></div>);
                                return pendingAction.map(t => (
                                  <div key={t.id} onClick={() => openTicketFresh(t)} className="anim-in bg-gray-50 rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start gap-4 hover:bg-white cursor-pointer">
                                    <div className="flex-1"><p className="font-bold text-sm text-gray-900">{t.location}</p><p className="text-xs text-gray-600 truncate max-w-lg mt-1 mb-2">{t.description}</p><StatusPipeline status={t.status} /><ImageGallery ticket={t} maxPreview={2} /></div>
                                    <div className="flex gap-2 w-full md:w-auto"><span className="text-xs bg-blue-50 text-blue-900 px-5 py-2.5 rounded-xl font-bold flex-1 md:flex-none text-center">Chat</span><button onClick={(e) => markAsResolved(t, e)} className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl font-bold flex-1 md:flex-none">Mark Fixed</button></div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {(activeSidebarTab === 'qr_generator' && isHOD) && (
                <>
                  <div className="flex-shrink-0 p-4 md:p-6 lg:p-8 pb-0"><div className="bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/60 p-6 rounded-2xl shadow-sm border border-blue-100"><h2 className="text-lg md:text-2xl font-black text-gray-900">📱 QR Code Generator</h2><p className="text-xs text-gray-500 mt-1 font-medium">Print QR codes for <strong className="text-blue-900">{currentRole}</strong> rooms. Students scan to report issues instantly.</p></div></div>
                  <div className="flex-1 overflow-y-auto scrollbar-slim p-4 md:p-6 lg:p-8 pt-4 md:pt-6">
                    <div className="max-w-5xl mx-auto space-y-6">
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-700 to-indigo-500"></span>Generate QR for a Room</h3>
                        <div className="flex flex-col md:flex-row gap-3">
                          <input type="text" placeholder="e.g., CS Lab 2, Washroom B-1" value={qrRoomName} onChange={(e) => setQrRoomName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!qrRoomName.trim()) return; const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(qrRoomName.trim())}`; setGeneratedQRs(prev => [...prev, { room: qrRoomName.trim(), url, id: Date.now() }]); setQrRoomName(''); triggerSnackbar('QR generated!'); } }} className="flex-1 border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-700" />
                          <button onClick={() => { if (!qrRoomName.trim()) return; const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(qrRoomName.trim())}`; setGeneratedQRs(prev => [...prev, { room: qrRoomName.trim(), url, id: Date.now() }]); setQrRoomName(''); triggerSnackbar('QR generated!'); }} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg whitespace-nowrap">Generate QR</button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 mb-2"><p className="text-[10px] font-bold uppercase text-gray-500">⚡ Quick Presets</p><span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase">{getDeptAbbrev(currentRole)} DEPARTMENT</span></div>
                          <div className="flex flex-wrap gap-2">{getDeptPresets(currentRole).map(preset => (<button key={preset} type="button" onClick={() => { const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(preset)}`; setGeneratedQRs(prev => [...prev, { room: preset, url, id: Date.now() }]); triggerSnackbar(`QR: ${preset}`); }} className="text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors">+ {preset}</button>))}</div>
                        </div>
                      </div>
                      {generatedQRs.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500"></span>Generated ({generatedQRs.length})</h3><div className="flex gap-2"><button onClick={() => window.print()} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5"><Icons.Download /> Print All</button><button onClick={() => setGeneratedQRs([])} className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-4 py-2 rounded-xl">Clear All</button></div></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {generatedQRs.map((qr) => (
                              <div key={qr.id} className="border-2 border-dashed border-gray-300 rounded-2xl p-5 text-center bg-gradient-to-b from-white to-blue-50/30">
                                <div className="bg-white p-3 rounded-xl inline-block shadow-sm"><QRCodeSVG value={qr.url} size={160} level="H" includeMargin={false} fgColor="#0a1a3f" /></div>
                                <h4 className="text-sm font-black text-gray-900 mt-3">{qr.room}</h4><p className="text-[10px] text-gray-500 mt-1">📱 Scan to report</p>
                                <div className="flex gap-2 mt-3"><button onClick={() => setGeneratedQRs(prev => prev.filter(x => x.id !== qr.id))} className="flex-1 text-[10px] text-red-600 hover:bg-red-50 font-bold py-1.5 rounded-lg border border-red-200">Remove</button><a href={qr.url} target="_blank" rel="noreferrer" className="flex-1 text-[10px] text-blue-700 hover:bg-blue-50 font-bold py-1.5 rounded-lg border border-blue-200 text-center">Test Link</a></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                        <h4 className="text-sm font-black text-blue-900 mb-3">💡 How It Works</h4>
                        <ol className="space-y-2 text-xs text-blue-900/80 leading-relaxed"><li><strong>1.</strong> Type room name and click Generate QR</li><li><strong>2.</strong> Click "Print All" and paste QR codes on room doors</li><li><strong>3.</strong> Students scan with phone camera</li><li><strong>4.</strong> Report form opens automatically with location pre-filled</li><li><strong>5.</strong> Submit in 30 seconds ⚡</li></ol>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(activeSidebarTab === 'harassment_reports' && isHarassmentAdmin) && (
                <>
                  <div className="flex-shrink-0 p-4 md:p-6 lg:p-8 pb-0">
                    <div className="bg-gradient-to-br from-red-900 via-rose-900 to-red-800 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="relative z-10">
                        <span className="bg-white/15 backdrop-blur text-red-100 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ring-1 ring-white/20 inline-flex items-center gap-1.5"><Icons.Lock /> Restricted Access</span>
                        <h2 className="text-2xl md:text-3xl font-black mt-3 flex items-center gap-3"><Icons.Shield /> Harassment & Discipline Cell</h2>
                        <p className="text-xs md:text-sm text-red-100/80 mt-2 max-w-2xl font-medium">Confidential reports dashboard. Access restricted to authorized committee members only.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 pt-5">
                    <div className="grid grid-cols-3 gap-4 max-w-3xl">
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 anim-in"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold uppercase text-gray-400">Total Reports</span><div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center"><Icons.Document /></div></div><p className="text-3xl font-black text-gray-900">{getHarassmentStats().total}</p></div>
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 anim-in"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold uppercase text-gray-400">Open</span><div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center"><Icons.Warning /></div></div><p className="text-3xl font-black text-orange-700">{getHarassmentStats().open}</p></div>
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 anim-in"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold uppercase text-gray-400">Resolved</span><div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Icons.Check /></div></div><p className="text-3xl font-black text-emerald-700">{getHarassmentStats().resolved}</p></div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 pt-5">
                    <div className="flex items-center gap-2 max-w-3xl flex-wrap"><span className="text-xs font-bold text-gray-500">Filter:</span>{[{ key: 'all', label: 'All Reports' },{ key: 'open', label: '🔴 Open' },{ key: 'resolved', label: '✅ Resolved' },].map(f => (<button key={f.key} onClick={() => setHarassmentFilter(f.key)} className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all ${harassmentFilter === f.key ? 'bg-red-900 text-white border-red-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{f.label}</button>))}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-slim p-4 md:p-6 lg:p-8 pt-5">
                    <div className="space-y-4 pb-10 max-w-5xl">
                      {isLoadingTickets ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><Icons.Spinner /><p className="text-sm font-bold text-gray-700 mt-2">Loading reports...</p></div>
                      ) : getFilteredHarassmentTickets().length === 0 ? (
                        <div className="bg-white/80 rounded-3xl border border-dashed border-gray-300 p-14 text-center anim-in"><div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3"><Icons.Shield /></div><p className="text-sm font-bold text-gray-700">No {harassmentFilter !== 'all' ? harassmentFilter : ''} harassment reports</p><p className="text-xs text-gray-400 mt-1">Reports submitted by students will appear here.</p></div>
                      ) : (
                        getFilteredHarassmentTickets().map(ticket => {
                          const parsed = parseHarassmentReport(ticket.description);
                          const isResolved = ticket.status === 'RESOLVED';
                          return (
                            <div key={ticket.id} className={`anim-in bg-white rounded-2xl border-2 p-5 md:p-6 shadow-sm relative overflow-hidden ${isResolved ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 pulse-red'}`}>
                              <span className={`absolute left-0 top-0 h-full w-1.5 ${isResolved ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              <div className="flex justify-between items-start mb-4 pl-3">
                                <div><div className="flex items-center gap-2 mb-1 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{isResolved ? '✓ Resolved' : '⚠️ Awaiting Action'}</span><span className="text-[10px] font-bold text-gray-400">#{ticket.id.substring(0, 8).toUpperCase()}</span></div><p className="text-[10px] text-gray-500 font-medium">Submitted: {new Date(ticket.created_at).toLocaleString()}</p></div>
                                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0"><Icons.Warning /></div>
                              </div>
                              <div className="pl-3 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200"><p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">👤 Complainant</p><p className="text-sm font-bold text-gray-900">{parsed.name}</p><p className="text-xs text-gray-600 font-mono mt-0.5 flex items-center gap-1.5"><Icons.Phone /> {parsed.contact}</p><p className="text-[10px] text-gray-500 mt-1">Roll: <span className="font-mono">{ticket.roll_number}</span></p></div>
                                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200"><p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">🎯 Accused</p><p className="text-sm font-bold text-red-800">{parsed.accusedName}</p><p className="text-xs text-gray-600 mt-0.5">{parsed.accusedType}</p></div>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200"><p className="text-[9px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">📝 Incident Statement</p><p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">{parsed.statement}</p></div>
                                {getTicketImages(ticket).length > 0 && (
                                  <div><p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">📎 Attached Evidence ({getTicketImages(ticket).length})</p><div className="flex flex-wrap gap-2">{getTicketImages(ticket).map((url, idx) => (<img key={idx} src={url} alt={`Evidence ${idx + 1}`} onClick={() => setLightboxImage(url)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity" />))}</div></div>
                                )}
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100"><button onClick={() => setSelectedHarassment(ticket)} className="text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl flex items-center gap-1.5"><Icons.Eye /> Full Details</button>{!isResolved && (<button onClick={(e) => markHarassmentResolved(ticket, e)} className="text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5"><Icons.Check /> Mark Resolved</button>)}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        )}

        {selectedHarassment && isHarassmentAdmin && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] h-[100dvh] w-screen overflow-hidden">
            <div className="anim-pop bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-red-900 to-rose-800 text-white p-6 flex justify-between items-start">
                <div><span className="bg-white/15 text-red-100 text-[10px] font-bold px-3 py-1 rounded-full uppercase inline-flex items-center gap-1.5"><Icons.Lock /> Confidential</span><h3 className="text-xl font-black mt-2">Report #{selectedHarassment.id.substring(0, 8).toUpperCase()}</h3><p className="text-xs text-red-100/80 mt-1">Submitted: {new Date(selectedHarassment.created_at).toLocaleString()}</p></div>
                <button onClick={() => setSelectedHarassment(null)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center"><Icons.X /></button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-slim p-6 space-y-5">
                {(() => {
                  const parsed = parseHarassmentReport(selectedHarassment.description);
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">👤 Complainant Info</p><p className="text-sm"><span className="font-bold text-gray-700">Name:</span> <span className="text-gray-900">{parsed.name}</span></p><p className="text-sm mt-1"><span className="font-bold text-gray-700">Contact:</span> <span className="text-gray-900 font-mono">{parsed.contact}</span></p><p className="text-sm mt-1"><span className="font-bold text-gray-700">Roll:</span> <span className="text-gray-900 font-mono">{selectedHarassment.roll_number}</span></p></div>
                        <div className="bg-red-50 rounded-2xl p-4 border border-red-200"><p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">🎯 Accused Info</p><p className="text-sm"><span className="font-bold text-gray-700">Category:</span> <span className="text-red-900 font-bold">{parsed.accusedType}</span></p><p className="text-sm mt-1"><span className="font-bold text-gray-700">Name:</span> <span className="text-red-900">{parsed.accusedName}</span></p></div>
                      </div>
                      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200"><p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-2">📝 Detailed Incident Statement</p><p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{parsed.statement}</p></div>
                      {getTicketImages(selectedHarassment).length > 0 && (
                        <div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">📎 Attached Evidence ({getTicketImages(selectedHarassment).length})</p><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{getTicketImages(selectedHarassment).map((url, idx) => (<img key={idx} src={url} alt={`Evidence ${idx + 1}`} onClick={() => setLightboxImage(url)} className="w-full h-32 object-cover rounded-xl border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity" />))}</div></div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-between items-center gap-3">
                <div><span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg ${selectedHarassment.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>Status: {selectedHarassment.status === 'RESOLVED' ? '✓ Resolved' : '⚠️ Awaiting Action'}</span></div>
                <div className="flex gap-2"><button onClick={() => setSelectedHarassment(null)} className="text-xs font-bold text-gray-600 bg-white border border-gray-300 px-5 py-2.5 rounded-xl hover:bg-gray-100">Close</button>{selectedHarassment.status !== 'RESOLVED' && (<button onClick={(e) => { markHarassmentResolved(selectedHarassment, e); setSelectedHarassment(null); }} className="text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"><Icons.Check /> Mark as Resolved</button>)}</div>
              </div>
            </div>
          </div>
        )}

        {selectedTicket && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100] h-[100dvh] w-screen overflow-hidden">
            <div className="anim-pop bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row shadow-2xl overflow-hidden relative">
              <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 bg-white hover:bg-red-500 hover:text-white text-gray-700 w-9 h-9 rounded-full flex items-center justify-center font-bold z-20 shadow-lg border"><Icons.X /></button>
              <div className={`w-full ${(!isStudent || user?.rollNumber === selectedTicket.roll_number) ? 'md:w-1/2 border-r' : 'mx-auto max-w-3xl'} p-6 md:p-8 bg-gradient-to-b from-gray-50 to-white overflow-y-auto scrollbar-slim h-full`}>
                <div className="flex justify-between items-start mb-6 pr-10"><h3 className="text-xl font-extrabold text-gray-900">Issue Details</h3><span className={`text-[10px] font-bold px-3 py-1 rounded-lg uppercase ${selectedTicket.status === 'RESOLVED' ? 'text-green-800 bg-green-100' : 'text-blue-800 bg-blue-100'}`}>{selectedTicket.status}</span></div>
                <div className="space-y-5">
                  <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Reported By</p><p className="font-mono text-sm text-gray-800 bg-white p-3 rounded-xl border">{(!isStudent || user?.rollNumber === selectedTicket.roll_number) ? selectedTicket.roll_number : 'Anonymous Student'}</p>{(isHOD || isGeneralAdmin) && (<p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2 font-semibold flex items-center gap-1.5"><Icons.Info /> Admin view — full identity visible for action</p>)}</div>
                  <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Location</p><p className="font-semibold text-sm text-gray-900 bg-white p-3 rounded-xl border">{selectedTicket.location}</p></div>
                  {selectedTicket.map_coordinates && (<a href={`https://www.google.com/maps?q=${selectedTicket.map_coordinates.lat},${selectedTicket.map_coordinates.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-900 bg-blue-100 px-4 py-2.5 rounded-xl"><Icons.MapPin /> Open Map</a>)}
                  <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Description</p><p className="text-sm text-gray-700 whitespace-pre-line bg-white p-4 rounded-xl border">{selectedTicket.description}</p></div>
                  {getTicketImages(selectedTicket).length > 0 && (() => {
                    const images = getTicketImages(selectedTicket);
                    const canView = user?.rollNumber === selectedTicket.roll_number || !isStudent;
                    return (
                      <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Attached Evidence ({images.length})</p>{!canView ? (<div className="p-4 bg-gray-50 border rounded-xl flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center"><Icons.Lock /></div><div><p className="text-xs font-bold text-gray-700">Images are private</p><p className="text-[10px] text-gray-500">Only the ticket owner and HOD can view attached images.</p></div></div>) : (<div className="grid grid-cols-2 gap-3">{images.map((url, idx) => (<img key={idx} src={url} alt={`Evidence ${idx + 1}`} onClick={() => setLightboxImage(url)} className="w-full rounded-xl border shadow-sm object-cover max-h-48 cursor-zoom-in" />))}</div>)}</div>
                    );
                  })()}
                </div>
              </div>
              {(!isStudent || user?.rollNumber === selectedTicket.roll_number) && (
                <div className="w-full md:w-1/2 flex flex-col bg-white h-full relative">
                  <div className="p-5 border-b bg-gradient-to-r from-white to-blue-50/50 shadow-sm z-10"><h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Secure Communication Thread</h3></div>
                  <div className="flex-1 p-6 overflow-y-auto scrollbar-slim space-y-4 bg-[#e5ddd5]/20">
                    {(!selectedTicket.comments || selectedTicket.comments.length === 0) ? (<div className="text-center text-gray-400 text-xs mt-10 bg-gray-50 py-4 rounded-xl border border-dashed">No messages yet.</div>) : (
                      selectedTicket.comments.map(c => {
                        const isMine = c.sender === currentSenderName;
                        const isEditing = editingCommentId === c.id;
                        return (
                          <div key={c.id} className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] font-bold text-gray-400 mb-1 mx-1">{c.sender}</span>
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${isMine ? 'bg-gradient-to-br from-[#dcf8c6] to-[#d2f0b8] rounded-tr-none border border-green-200' : 'bg-white border rounded-tl-none'}`}>
                              {isEditing ? (<div className="flex flex-col gap-2 min-w-[200px]"><input type="text" value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} className="w-full border-b bg-transparent text-sm focus:outline-none py-1" autoFocus /><div className="flex justify-end gap-3 mt-1"><button onClick={() => setEditingCommentId(null)} className="text-[10px] font-bold text-gray-500 bg-white px-2 py-1 rounded">Cancel</button><button onClick={() => handleEditCommentSubmit(c.id)} className="text-[10px] font-bold text-white bg-blue-600 px-2 py-1 rounded">Save</button></div></div>) : (<div className="whitespace-pre-wrap">{c.text}</div>)}
                            </div>
                            {isMine && !isEditing && (<div className="flex gap-3 text-[10px] font-bold text-gray-400 mt-1 opacity-0 group-hover:opacity-100"><button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }} className="hover:text-blue-600">Edit</button><button onClick={() => handleDeleteComment(c.id)} className="hover:text-red-500">Delete</button></div>)}
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-4 border-t bg-gray-50 z-10">
                    {selectedTicket.status === 'RESOLVED' ? (<p className="text-xs text-center text-gray-500 font-bold py-2.5 bg-gray-200 rounded-xl">Ticket closed.</p>) : (
                      <form onSubmit={handleAddComment} className="flex gap-2"><input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Type a message..." className="flex-1 border rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-blue-900" /><button type="submit" className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg">Send</button></form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] h-[100dvh] w-screen overflow-hidden">
            <div className="anim-pop bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-slim">
              <h3 className="text-xl font-extrabold text-gray-900 mb-6">Report Infrastructure Issue</h3>
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <select value={category} onChange={(e) => { const newCat = e.target.value; setCategory(newCat); if (newCat === 'General') setSelectedPosition(null); }} className="w-full border rounded-xl p-3 text-xs font-bold">
                  <option value="Electrical">Electrical (AC, Lights, Fans)</option>
                  <option value="IT / Network">IT & Wi-Fi Network</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="General">General Campus Issue</option>
                </select>
                {category !== 'General' && (<select value={deptNameInput} onChange={(e) => setDeptNameInput(e.target.value)} className="w-full border rounded-xl p-3 text-xs font-bold text-blue-900">{universityDepartments.map(d => <option key={d} value={d}>{d}</option>)}</select>)}
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Specific Location (e.g., CS Lab 2)" className="w-full border rounded-xl p-3 text-xs" required />
                {category !== 'General' && (<div className="flex items-center justify-between bg-gray-50 border rounded-xl p-3"><span className="text-xs text-gray-600">{selectedPosition ? `📍 ${selectedPosition[0].toFixed(4)}, ${selectedPosition[1].toFixed(4)}` : 'No pin set'}</span><button type="button" onClick={() => setShowMapModal(true)} className="text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1.5 rounded-lg"><Icons.Map /> Map</button></div>)}
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue..." rows="3" className="w-full border rounded-xl p-3 text-xs resize-none" required></textarea>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1.5">Upload Images (Max 5, 40MB each)</label>
                  <input type="file" accept="image/*" multiple onChange={(e) => {
                    const files = Array.from(e.target.files);
                    const MAX = 40 * 1024 * 1024;
                    const validTypes = files.filter(f => f.type.startsWith('image/'));
                    const invalidTypes = files.filter(f => !f.type.startsWith('image/'));
                    const oversized = validTypes.filter(f => f.size > MAX);
                    const valid = validTypes.filter(f => f.size <= MAX);
                    if (invalidTypes.length > 0) alert(`⚠️ ${invalidTypes.length} file(s) are not images and were skipped.`);
                    if (oversized.length > 0) alert(`⚠️ ${oversized.length} file(s) exceeded 40MB`);
                    if (issueImages.length + valid.length > 5) { alert('⚠️ Max 5 images'); return; }
                    setIssueImages(prev => [...prev, ...valid]);
                    e.target.value = '';
                  }} className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-blue-50 file:text-blue-900 cursor-pointer" />
                  {imagePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border bg-gray-50">
                          <img src={preview.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setIssueImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-3 bg-gradient-to-r from-blue-900 to-indigo-800 text-white font-bold text-xs rounded-xl disabled:opacity-50">{submitting ? `Uploading (${issueImages.length})...` : 'Submit Ticket'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAdminModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] h-[100dvh] w-screen overflow-hidden">
            <div className="anim-pop bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
              <button onClick={() => { setShowAdminModal(false); setAuthError(''); setAdminForgotState({ step: 'idle', email: '' }); setAdminEmail(''); setAdminPassword(''); setAdminForgotEmail(''); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 flex items-center justify-center font-bold transition-colors text-sm">✕</button>
              {adminForgotState.step === 'sent' ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4"><Icons.Mail /></div>
                  <h3 className="text-lg font-extrabold text-gray-900 mb-1">Reset Link Sent</h3>
                  <p className="text-xs text-gray-500 mb-6">Password reset link sent to<br /><strong className="font-mono text-blue-900 break-all">{adminForgotState.email}</strong></p>
                  <button onClick={() => { setAdminForgotState({ step: 'idle', email: '' }); setAdminForgotEmail(''); }} className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">← Back to Login</button>
                </div>
              ) : adminForgotState.step === 'forgot' ? (
                <>
                  <div className="text-center mb-5"><div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 flex items-center justify-center mb-3 ring-8 ring-amber-50"><Icons.Lock /></div><h3 className="text-lg font-extrabold text-gray-900 mb-1">Reset Password</h3><p className="text-xs text-gray-500">Enter your university email</p></div>
                  <form onSubmit={handleAdminForgotPassword} className="space-y-4">
                    <input type="email" value={adminForgotEmail} onChange={(e) => setAdminForgotEmail(e.target.value)} placeholder="hod.cs@smartcampus.muet" className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required />
                    {authError && (<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2"><Icons.Warning /> {authError}</div>)}
                    <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setAdminForgotState({ step: 'idle', email: '' }); setAuthError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Back</button><button type="submit" disabled={isSendingAdminReset} className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">{isSendingAdminReset ? <><Icons.Spinner /> Sending...</> : 'Send Reset Link'}</button></div>
                  </form>
                </>
              ) : (
                <>
                  <div className="text-center mb-5"><div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-800 flex items-center justify-center mb-3 ring-8 ring-blue-50"><Icons.Shield /></div><h3 className="text-lg font-extrabold text-gray-900 mb-1">HOD / Admin Portal</h3><p className="text-xs text-gray-500">Enter your university credentials</p></div>
                  <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                    <div><label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">University Email</label><input type="email" placeholder="hod.cs@smartcampus.muet" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required /></div>
                    <div><label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Password</label><div className="relative"><input type={showAdminPassword ? "text" : "password"} placeholder="••••••••" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full border rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required /><button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-700 p-1">{showAdminPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button></div><div className="flex justify-end mt-2"><button type="button" onClick={() => { setAdminForgotState({ step: 'forgot', email: '' }); setAuthError(''); setAdminForgotEmail(adminEmail); }} className="text-[11px] text-blue-700 hover:text-blue-900 font-bold">Forgot password?</button></div></div>
                    {authError && (<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2"><Icons.Warning /> {authError}</div>)}
                    <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowAdminModal(false); setAuthError(''); setAdminEmail(''); setAdminPassword(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Cancel</button><button type="submit" disabled={isLoggingIn} className="flex-1 py-2.5 bg-gradient-to-r from-blue-900 to-indigo-800 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">{isLoggingIn ? <><Icons.Spinner /> Signing in...</> : 'Login'}</button></div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {showResetPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] h-[100dvh] w-screen overflow-hidden">
            <div className="anim-pop bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
              <div className="text-center mb-5"><div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-800 flex items-center justify-center mb-3 ring-8 ring-blue-50"><Icons.Lock /></div><h3 className="text-xl font-extrabold text-gray-900 mb-1">Set New Password</h3></div>
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="relative"><input type={showNewPassword ? "text" : "password"} placeholder="New Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500/20" required minLength={6} /><button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-700 p-1">{showNewPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button></div>
                {authError && (<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2"><Icons.Warning /> {authError}</div>)}
                <button type="submit" disabled={isResettingPassword} className="w-full py-3 bg-gradient-to-br from-blue-900 to-indigo-800 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">{isResettingPassword ? <><Icons.Spinner /> Updating...</> : 'Update Password'}</button>
              </form>
            </div>
          </div>
        )}

        {showMapModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 md:p-4 z-[100] h-[100dvh] w-screen overflow-hidden">
            <div className="anim-pop bg-white rounded-3xl max-w-3xl w-full p-4 md:p-6 shadow-2xl flex flex-col h-[92vh]">
              <div className="flex justify-between items-center mb-3 flex-shrink-0"><h3 className="text-base font-extrabold">Pin Location</h3><button type="button" onClick={() => { setShowMapModal(false); setPastedCoords(''); }} className="w-8 h-8 bg-gray-100 rounded-full font-bold text-xs flex items-center justify-center"><Icons.X /></button></div>
              <div className="grid grid-cols-3 gap-2 mb-3 flex-shrink-0">
                <button type="button" onClick={useCurrentLocation} className="flex flex-col items-center gap-1 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl"><Icons.Crosshair /><span className="text-[10px] font-bold text-emerald-800">My Location</span></button>
                <button type="button" onClick={() => window.open('https://www.google.com/maps/@25.4095,68.2619,16z', '_blank')} className="flex flex-col items-center gap-1 py-2.5 bg-blue-50 border border-blue-200 rounded-xl"><Icons.Globe /><span className="text-[10px] font-bold text-blue-800">Google Maps</span></button>
                <button type="button" onClick={() => setSelectedPosition(null)} className="flex flex-col items-center gap-1 py-2.5 bg-red-50 border border-red-200 rounded-xl"><Icons.X /><span className="text-[10px] font-bold text-red-800">Clear Pin</span></button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-2"><Icons.Link /><p className="text-[10px] font-bold text-amber-800">📋 Paste coordinates</p></div><button type="button" onClick={showCoordsHelp} className="text-[9px] font-bold text-amber-700 underline">How?</button></div>
                <div className="flex gap-2"><input type="text" value={pastedCoords} onChange={(e) => setPastedCoords(e.target.value)} placeholder="25.4089, 68.2619" className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-xs font-mono bg-white" /><button type="button" onClick={() => { const coords = parseCoordinates(pastedCoords); if (coords) { setSelectedPosition(coords); setPastedCoords(''); triggerSnackbar('📍 Pin placed!'); } else alert('❌ Invalid format'); }} disabled={!pastedCoords.trim()} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">Pin It</button></div>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 relative">
                <MapContainer key={showMapModal ? 'open' : 'closed'} center={selectedPosition || [25.4095, 68.2619]} zoom={16} scrollWheelZoom={true} dragging={true} touchZoom={true} doubleClickZoom={true} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <LocationMarker selectedPosition={selectedPosition} setSelectedPosition={setSelectedPosition} />
                </MapContainer>
                {selectedPosition && (<div className="absolute bottom-3 left-3 right-3 bg-blue-900/95 text-white rounded-lg px-3 py-2 text-[10px] font-mono flex items-center justify-between"><span>📍 {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}</span><span className="text-blue-200 text-[9px]">Pin Active</span></div>)}
              </div>
              <div className="flex justify-between items-center mt-3 flex-shrink-0"><button type="button" onClick={showCoordsHelp} className="text-[10px] text-blue-700 font-bold flex items-center gap-1.5"><Icons.Eye /> How to get coordinates?</button><button type="button" onClick={() => { setShowMapModal(false); setPastedCoords(''); }} className="text-xs text-white bg-gradient-to-r from-blue-900 to-indigo-800 font-bold px-6 py-2.5 rounded-xl">{selectedPosition ? '✓ Confirm' : 'Close'}</button></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}