import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  Building2,
  Briefcase,
  Key,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  Upload,
  Zap,
  Sparkles,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  RefreshCw,
  X,
  Target,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  UserCheck,
  Check,
  Edit,
  Lock,
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

const UnifiedHRHub = () => {
  const { t } = useI18n();
  const { currentUser, isSuperAdmin, isAdmin, isHR, hasPermission } = useAuth();

  const canManageRoles = isSuperAdmin || isAdmin || hasPermission('rbac:manage');
  const canManageOrg = isSuperAdmin || isAdmin || isHR || hasPermission('org:manage');

  // Active Main Sub-Tab: 'personnel' | 'roles' | 'org'
  const [activeTab, setActiveTab] = useState('personnel');

  // Notification Toast
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --------------------------------------------------------------------------
  // 1. DATA STATES
  // --------------------------------------------------------------------------
  const [employees, setEmployees] = useState([]);
  const [iamUsers, setIamUsers] = useState([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Roles & Permissions
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Departments & Positions
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);

  // --------------------------------------------------------------------------
  // 2. MODAL STATES
  // --------------------------------------------------------------------------
  // Add Employee
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);
  const [empFormError, setEmpFormError] = useState('');
  const [newEmpForm, setNewEmpForm] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    phone_number: '',
    department: '',
    position: '',
    create_iam_account: true,
    username: '',
    password: '',
    role_ids: [],
  });

  // Edit Personnel Modal
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [editEmpForm, setEditEmpForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    department: '',
    position: '',
    is_active: true,
    password: '',
    role_ids: [],
  });
  const [isUpdatingEmp, setIsUpdatingEmp] = useState(false);

  // Add / Edit Role
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    permission_ids: [],
  });

  // Add / Edit Department
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ code: '', name: '', description: '' });

  // Add / Edit Position
  const [showPosModal, setShowPosModal] = useState(false);
  const [editingPos, setEditingPos] = useState(null);
  const [posForm, setPosForm] = useState({ code: '', name: '', level: 1, description: '' });

  // 5-Angle Face Registration Modal
  const [showFaceRegModal, setShowFaceRegModal] = useState(false);
  const [selectedEmployeeForFace, setSelectedEmployeeForFace] = useState(null);

  // --------------------------------------------------------------------------
  // 3. 5-ANGLE MULTI-TEMPLATE FACE REGISTRATION STATE
  // --------------------------------------------------------------------------
  const FACE_ANGLES = [
    {
      id: 'straight',
      step: 1,
      title: t('angle_1_title', 'Góc 1: Nhìn Thẳng Trung Tâm'),
      desc: t('angle_1_desc', 'Giữ thẳng đầu, mắt nhìn thẳng vào tâm ống kính camera'),
      badge: t('angle_1_badge', 'Thẳng (Center)'),
      instruction: t('angle_1_instruction', 'NHÌN THẲNG VÀO TRUNG TÂM CAMERA'),
      guideType: 'center',
      icon: Target,
      themeColor: 'from-cyan-500 to-indigo-500',
    },
    {
      id: 'left',
      step: 2,
      title: t('angle_2_title', 'Góc 2: Quay Mặt Sang Trái (~20°)'),
      desc: t('angle_2_desc', 'Nghiêng và quay mặt nhẹ nhàng sang phía BÊN TRÁI'),
      badge: t('angle_2_badge', 'Quay Trái (Yaw -20°)'),
      instruction: t('angle_2_instruction', 'QUAY MẶT SANG BÊN TRÁI (~20°)'),
      guideType: 'left',
      icon: ArrowLeft,
      themeColor: 'from-purple-500 to-indigo-500',
    },
    {
      id: 'right',
      step: 3,
      title: t('angle_3_title', 'Góc 3: Quay Mặt Sang Phải (~20°)'),
      desc: t('angle_3_desc', 'Nghiêng và quay mặt nhẹ nhàng sang phía BÊN PHẢI'),
      badge: t('angle_3_badge', 'Quay Phải (Yaw +20°)'),
      instruction: t('angle_3_instruction', 'QUAY MẶT SANG BÊN PHẢI (~20°)'),
      guideType: 'right',
      icon: ArrowRight,
      themeColor: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'down',
      step: 4,
      title: t('angle_4_title', 'Góc 4: Cúi Cằm Xuống Dưới (~15°)'),
      desc: t('angle_4_desc', 'Hơi cúi cằm và hạ thấp góc nhìn xuống dưới'),
      badge: t('angle_4_badge', 'Cúi Xuống (Pitch -15°)'),
      instruction: t('angle_4_instruction', 'HƠI CÚI CẰM XUỐNG DƯỚI (~15°)'),
      guideType: 'down',
      icon: ArrowDown,
      themeColor: 'from-amber-500 to-orange-500',
    },
    {
      id: 'up_smile',
      step: 5,
      title: t('angle_5_title', 'Góc 5: Ngẩng Lên & Cười Tự Nhiên ✨'),
      desc: t('angle_5_desc', 'Hơi ngẩng cằm lên và cười tươi tự nhiên để nhận diện biểu cảm'),
      badge: t('angle_5_badge', 'Ngẩng & Cười ✨'),
      instruction: t('angle_5_instruction', 'HƠI NGẨNG CẰM & CƯỜI TỰ NHIÊN ✨'),
      guideType: 'up',
      icon: ArrowUp,
      themeColor: 'from-emerald-500 to-teal-500',
    },
  ];

  const [angleFiles, setAngleFiles] = useState({});
  const [anglePreviews, setAnglePreviews] = useState({});
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [regMode, setRegMode] = useState('backend_cam');
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [isUploadingFaces, setIsUploadingFaces] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // --------------------------------------------------------------------------
  // 4. DATA FETCHERS
  // --------------------------------------------------------------------------
  const fetchAllPersonnel = useCallback(async () => {
    setPersonnelLoading(true);
    try {
      const [empRes, userRes] = await Promise.allSettled([
        api.getEmployees({ page: 1, page_size: 100, search: searchQuery.trim() || undefined }),
        api.getCoreUsers({ limit: 100, search: searchQuery.trim() || undefined }),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value) {
        const list = empRes.value?.data?.items || (Array.isArray(empRes.value) ? empRes.value : []);
        setEmployees(list);
      }
      if (userRes.status === 'fulfilled' && userRes.value) {
        const list = Array.isArray(userRes.value) ? userRes.value : (userRes.value?.items || userRes.value?.data?.items || userRes.value?.data || []);
        setIamUsers(list);
      }
    } catch (err) {
      console.warn('Error fetching personnel:', err);
    } finally {
      setPersonnelLoading(false);
    }
  }, [searchQuery]);

  const fetchRbac = useCallback(async () => {
    setRolesLoading(true);
    try {
      const [roleRes, permRes] = await Promise.allSettled([
        api.getRoles(),
        api.getPermissions(),
      ]);
      if (roleRes.status === 'fulfilled' && roleRes.value) {
        const list = Array.isArray(roleRes.value) ? roleRes.value : (roleRes.value?.data || []);
        setRoles(list);
      }
      if (permRes.status === 'fulfilled' && permRes.value) {
        const list = Array.isArray(permRes.value) ? permRes.value : (permRes.value?.data || []);
        setPermissions(list);
      }
    } catch (err) {
      console.warn('Error fetching RBAC:', err);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchOrg = useCallback(async () => {
    setOrgLoading(true);
    try {
      const [deptRes, posRes] = await Promise.allSettled([
        api.getDepartments(),
        api.getPositions(),
      ]);
      if (deptRes.status === 'fulfilled' && deptRes.value) {
        const list = Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value?.data || []);
        setDepartments(list);
      }
      if (posRes.status === 'fulfilled' && posRes.value) {
        const list = Array.isArray(posRes.value) ? posRes.value : (posRes.value?.data || []);
        setPositions(list);
      }
    } catch (err) {
      console.warn('Error fetching Org:', err);
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPersonnel();
    if (canManageRoles) {
      fetchRbac();
    }
    if (canManageOrg) {
      fetchOrg();
    }
  }, [fetchAllPersonnel, fetchRbac, fetchOrg, canManageRoles, canManageOrg]);

  // --------------------------------------------------------------------------
  // 5. UNIFIED PERSONNEL LIST MERGING (Employees + IAM Users)
  // --------------------------------------------------------------------------
  const unifiedPersonnelList = React.useMemo(() => {
    const list = [];
    const matchedEmployeeIds = new Set();

    iamUsers.forEach((u) => {
      const userCode = (u.user_code || u.username || '').toUpperCase().trim();
      const userEmail = (u.email || '').toLowerCase().trim();
      const userFullName = (u.profile?.full_name || u.full_name || '').toLowerCase().trim();

      const emp = employees.find((e) => {
        const eCode = (e.employee_code || '').toUpperCase().trim();
        const eEmail = (e.email || '').toLowerCase().trim();
        const eFullName = (e.full_name || '').toLowerCase().trim();

        return (
          (eCode && userCode && (eCode === userCode || eCode === (u.username || '').toUpperCase().trim())) ||
          (eEmail && userEmail && eEmail === userEmail) ||
          (eFullName && userFullName && eFullName === userFullName)
        );
      });

      if (emp) {
        matchedEmployeeIds.add(emp.id);
      }

      const faceCount = emp ? (emp.registered_faces_count !== undefined ? emp.registered_faces_count : (emp.face_features?.length || 0)) : 0;

      list.push({
        key: `iam_${u.id}`,
        iamUser: u,
        employee: emp || null,
        full_name: u.profile?.full_name || u.full_name || emp?.full_name || u.username,
        code: u.user_code || emp?.employee_code || u.username,
        email: u.email || emp?.email || '',
        phone: u.profile?.phone_number || emp?.phone_number || '',
        department: u.department?.name || u.department_name || emp?.department || '',
        position: u.position?.name || u.position_name || emp?.position || '',
        roles: u.roles || [],
        is_active: u.is_active !== undefined ? u.is_active : emp?.is_active ?? true,
        hasFaceAI: faceCount > 0,
        faceCount: faceCount,
      });
    });

    employees.forEach((emp) => {
      if (!matchedEmployeeIds.has(emp.id)) {
        const faceCount = emp.registered_faces_count !== undefined ? emp.registered_faces_count : (emp.face_features?.length || 0);
        list.push({
          key: `emp_${emp.id}`,
          iamUser: null,
          employee: emp,
          full_name: emp.full_name,
          code: emp.employee_code,
          email: emp.email || '',
          phone: emp.phone_number || '',
          department: emp.department || '',
          position: emp.position || '',
          roles: [],
          is_active: emp.is_active,
          hasFaceAI: faceCount > 0,
          faceCount: faceCount,
        });
      }
    });

    return list;
  }, [employees, iamUsers]);

  const filteredPersonnel = unifiedPersonnelList.filter((item) => {
    if (selectedDeptFilter && item.department !== selectedDeptFilter) return false;
    return true;
  });

  // --------------------------------------------------------------------------
  // 6. HANDLERS FOR UNIFIED EMPLOYEE & IAM USER
  // --------------------------------------------------------------------------
  const handleCreateUnifiedEmployee = async (e) => {
    e.preventDefault();
    setEmpFormError('');
    setIsSubmittingEmp(true);

    try {
      if (newEmpForm.create_iam_account && newEmpForm.username && newEmpForm.password) {
        const userPayload = {
          username: newEmpForm.username.trim(),
          email: newEmpForm.email.trim(),
          password: newEmpForm.password,
          full_name: newEmpForm.full_name.trim(),
          user_code: newEmpForm.employee_code.trim().toUpperCase(),
          phone_number: newEmpForm.phone_number?.trim() || null,
          role_ids: newEmpForm.role_ids || [],
        };
        const matchedDept = departments.find((d) => d.name === newEmpForm.department);
        const matchedPos = positions.find((p) => p.name === newEmpForm.position);
        if (matchedDept) userPayload.department_id = matchedDept.id;
        if (matchedPos) userPayload.position_id = matchedPos.id;

        try {
          await api.createCoreUser(userPayload);
        } catch (iamErr) {
          console.warn('IAM notice:', iamErr.message);
        }
      }

      const empPayload = {
        employee_code: newEmpForm.employee_code.trim().toUpperCase(),
        full_name: newEmpForm.full_name.trim(),
        email: newEmpForm.email.trim(),
        phone_number: newEmpForm.phone_number?.trim() || null,
        department: newEmpForm.department.trim(),
        position: newEmpForm.position.trim(),
        is_active: true,
      };
      const createdRes = await api.createEmployee(empPayload);
      const createdEmp = createdRes?.data || createdRes;

      showToast(`Success: "${newEmpForm.full_name}" created.`);
      setShowAddEmployeeModal(false);

      setNewEmpForm({
        employee_code: '',
        full_name: '',
        email: '',
        phone_number: '',
        department: '',
        position: '',
        create_iam_account: true,
        username: '',
        password: '',
        role_ids: [],
      });

      await fetchAllPersonnel();

      if (createdEmp && createdEmp.id) {
        openRegisterFaceModal(createdEmp);
      }
    } catch (err) {
      setEmpFormError(err.message || 'Cannot create personnel record.');
    } finally {
      setIsSubmittingEmp(false);
    }
  };

  // Open Edit Personnel Modal
  const openEditPersonnelModal = (item) => {
    setEditingPersonnel(item);
    const initialRoleIds = (item.roles || []).map((r) => (typeof r === 'string' ? roles.find((role) => role.name === r)?.id : r.id)).filter(Boolean);
    setEditEmpForm({
      full_name: item.full_name || '',
      email: item.email || '',
      phone_number: item.phone || '',
      department: item.department || '',
      position: item.position || '',
      is_active: item.is_active ?? true,
      password: '',
      role_ids: initialRoleIds,
    });
    setShowEditEmployeeModal(true);
  };

  // Submit Edit Personnel
  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    if (!editingPersonnel) return;
    setIsUpdatingEmp(true);

    try {
      // 1. Update Face AI Employee if exists
      if (editingPersonnel.employee?.id) {
        const empUpdateData = {
          full_name: editEmpForm.full_name.trim(),
          email: editEmpForm.email.trim(),
          phone_number: editEmpForm.phone_number?.trim() || null,
          department: editEmpForm.department.trim(),
          position: editEmpForm.position.trim(),
          is_active: editEmpForm.is_active,
        };
        await api.updateEmployee(editingPersonnel.employee.id, empUpdateData);
      }

      // 2. Update IAM User if exists
      if (editingPersonnel.iamUser?.id) {
        const userUpdateData = {
          email: editEmpForm.email.trim(),
          full_name: editEmpForm.full_name.trim(),
          phone_number: editEmpForm.phone_number?.trim() || null,
          is_active: editEmpForm.is_active,
          role_ids: editEmpForm.role_ids,
        };
        const matchedDept = departments.find((d) => d.name === editEmpForm.department);
        const matchedPos = positions.find((p) => p.name === editEmpForm.position);
        if (matchedDept) userUpdateData.department_id = matchedDept.id;
        if (matchedPos) userUpdateData.position_id = matchedPos.id;
        if (editEmpForm.password && editEmpForm.password.trim()) {
          userUpdateData.password = editEmpForm.password.trim();
        }

        await api.updateCoreUser(editingPersonnel.iamUser.id, userUpdateData);
      }

      showToast(`Cập nhật thông tin "${editEmpForm.full_name}" thành công!`);
      setShowEditEmployeeModal(false);
      fetchAllPersonnel();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật nhân sự', 'error');
    } finally {
      setIsUpdatingEmp(false);
    }
  };

  const handleDeletePersonnel = async (item) => {
    if (!window.confirm(`${t('confirm_delete', 'Confirm delete')} "${item.full_name}" (${item.code})?`)) {
      return;
    }
    try {
      if (item.employee?.id) {
        await api.deleteEmployee(item.employee.id);
      }
      if (item.iamUser?.id) {
        await api.deleteCoreUser(item.iamUser.id);
      }
      showToast(`Deleted "${item.full_name}" successfully!`);
      fetchAllPersonnel();
    } catch (err) {
      showToast(err.message || 'Error deleting personnel', 'error');
    }
  };

  const handleOpenFaceForPersonnel = async (item) => {
    if (item.employee) {
      openRegisterFaceModal(item.employee);
    } else {
      try {
        const empPayload = {
          employee_code: item.code || `EMP_${Date.now()}`,
          full_name: item.full_name,
          email: item.email || `${item.code}@company.com`,
          phone_number: item.phone || null,
          department: item.department || 'General',
          position: item.position || 'Staff',
          is_active: true,
        };
        const createdRes = await api.createEmployee(empPayload);
        const createdEmp = createdRes?.data || createdRes;
        await fetchAllPersonnel();
        openRegisterFaceModal(createdEmp);
      } catch (err) {
        showToast(err.message || 'Face AI linking error', 'error');
      }
    }
  };

  // --------------------------------------------------------------------------
  // 7. HANDLERS FOR ROLES (Create / Edit / Delete)
  // --------------------------------------------------------------------------
  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleForm({ name: '', display_name: '', description: '', permission_ids: [] });
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role) => {
    setEditingRole(role);
    const permIds = (role.permissions || []).map((p) => p.id);
    setRoleForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permission_ids: permIds,
    });
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        const payload = {
          display_name: roleForm.display_name.trim(),
          description: roleForm.description?.trim() || null,
          permission_ids: roleForm.permission_ids,
        };
        await api.updateRole(editingRole.id, payload);
        showToast(`Role "${roleForm.display_name}" updated!`);
      } else {
        const payload = {
          name: roleForm.name.trim().toLowerCase().replace(/\s+/g, '_'),
          display_name: roleForm.display_name.trim(),
          description: roleForm.description?.trim() || null,
          permission_ids: roleForm.permission_ids,
        };
        await api.createRole(payload);
        showToast(`Role "${payload.display_name}" created!`);
      }
      setShowRoleModal(false);
      fetchRbac();
    } catch (err) {
      showToast(err.message || 'Error saving role', 'error');
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system) {
      showToast('System default roles cannot be deleted!', 'error');
      return;
    }
    if (!window.confirm(`${t('confirm_delete', 'Confirm delete role')} "${role.display_name}"?`)) {
      return;
    }
    try {
      await api.deleteRole(role.id);
      showToast(`Role "${role.display_name}" deleted!`);
      fetchRbac();
    } catch (err) {
      showToast(err.message || 'Error deleting role', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // 8. HANDLERS FOR DEPARTMENTS (Create / Edit / Delete)
  // --------------------------------------------------------------------------
  const openCreateDeptModal = () => {
    setEditingDept(null);
    setDeptForm({ code: '', name: '', description: '' });
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
    });
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.updateDepartment(editingDept.id, {
          name: deptForm.name.trim(),
          description: deptForm.description?.trim() || null,
        });
        showToast(`Department "${deptForm.name}" updated!`);
      } else {
        await api.createDepartment({
          code: deptForm.code.trim().toUpperCase(),
          name: deptForm.name.trim(),
          description: deptForm.description?.trim() || null,
        });
        showToast(`Department "${deptForm.name}" created!`);
      }
      setShowDeptModal(false);
      fetchOrg();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`${t('confirm_delete', 'Confirm delete')} "${dept.name}" (${dept.code})?`)) {
      return;
    }
    try {
      await api.deleteDepartment(dept.id);
      showToast(`Department "${dept.name}" deleted!`);
      fetchOrg();
    } catch (err) {
      showToast(err.message || 'Error deleting department', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // 9. HANDLERS FOR POSITIONS (Create / Edit / Delete)
  // --------------------------------------------------------------------------
  const openCreatePosModal = () => {
    setEditingPos(null);
    setPosForm({ code: '', name: '', level: 1, description: '' });
    setShowPosModal(true);
  };

  const openEditPosModal = (pos) => {
    setEditingPos(pos);
    setPosForm({
      code: pos.code,
      name: pos.name,
      level: pos.level || 1,
      description: pos.description || '',
    });
    setShowPosModal(true);
  };

  const handleSavePos = async (e) => {
    e.preventDefault();
    try {
      if (editingPos) {
        await api.updatePosition(editingPos.id, {
          name: posForm.name.trim(),
          level: parseInt(posForm.level) || 1,
          description: posForm.description?.trim() || null,
        });
        showToast(`Position "${posForm.name}" updated!`);
      } else {
        await api.createPosition({
          code: posForm.code.trim().toUpperCase(),
          name: posForm.name.trim(),
          level: parseInt(posForm.level) || 1,
          description: posForm.description?.trim() || null,
        });
        showToast(`Position "${posForm.name}" created!`);
      }
      setShowPosModal(false);
      fetchOrg();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePos = async (pos) => {
    if (!window.confirm(`${t('confirm_delete', 'Confirm delete')} "${pos.name}" (${pos.code})?`)) {
      return;
    }
    try {
      await api.deletePosition(pos.id);
      showToast(`Position "${pos.name}" deleted!`);
      fetchOrg();
    } catch (err) {
      showToast(err.message || 'Error deleting position', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // 10. FACE CAPTURE HELPERS
  // --------------------------------------------------------------------------
  const [feedTimestamp, setFeedTimestamp] = useState(Date.now());

  const openRegisterFaceModal = async (emp) => {
    setSelectedEmployeeForFace(emp);
    setAngleFiles({});
    setAnglePreviews({});
    setActiveAngleIndex(0);
    setUploadResult(null);
    setVerifyResult(null);
    setRegMode('backend_cam');
    setFeedTimestamp(Date.now());
    setShowFaceRegModal(true);

    try {
      await api.startCamera({ source_type: 'WEBCAM', webcam_index: 0 });
      setTimeout(() => setFeedTimestamp(Date.now()), 500);
    } catch (err) {
      console.warn('Auto start camera notice:', err.message);
    }
  };

  const closeRegisterFaceModal = () => {
    setShowFaceRegModal(false);
    setSelectedEmployeeForFace(null);
    setUploadResult(null);
    setVerifyResult(null);
  };

  const captureBackendSnapshot = async () => {
    setIsCapturingSnapshot(true);
    try {
      const blob = await api.getDirectCameraSnapshotBlob();
      const currentAngle = FACE_ANGLES[activeAngleIndex];
      const filename = `${selectedEmployeeForFace.employee_code}_${currentAngle.id}_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      setAngleFiles((prev) => ({ ...prev, [currentAngle.id]: file }));
      setAnglePreviews((prev) => ({ ...prev, [currentAngle.id]: previewUrl }));

      if (activeAngleIndex < FACE_ANGLES.length - 1) {
        setActiveAngleIndex((prev) => prev + 1);
      }
    } catch (err) {
      showToast(err.message || 'Cannot capture snapshot from backend camera', 'error');
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  const handleManualUpload = (angleId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAngleFiles((prev) => ({ ...prev, [angleId]: file }));
    setAnglePreviews((prev) => ({ ...prev, [angleId]: previewUrl }));
    if (activeAngleIndex < FACE_ANGLES.length - 1) {
      setActiveAngleIndex((prev) => prev + 1);
    }
  };

  const readyPhotosCount = Object.keys(angleFiles).length;
  const isAllAnglesReady = readyPhotosCount === 5;

  const handleSave5AnglesFaceVectors = async () => {
    if (!isAllAnglesReady || !selectedEmployeeForFace) return;
    setIsUploadingFaces(true);
    setUploadResult(null);
    setVerifyResult(null);

    const formData = new FormData();
    FACE_ANGLES.forEach((angle) => {
      const file = angleFiles[angle.id];
      if (file) formData.append('images', file);
    });

    try {
      const res = await api.registerFace(selectedEmployeeForFace.id, formData);
      const data = res.data || res;
      setUploadResult({
        success: data.total_registered > 0,
        message: res.message || 'Đã trích xuất & lưu thành công vector khuôn mặt 512D',
        total_registered: data.total_registered,
        total_uploaded: data.total_uploaded,
        results: data.results || [],
      });
      await fetchAllPersonnel();
      if (data.total_registered > 0) {
        showToast(`✅ Đã trích xuất & lưu thành công ${data.total_registered}/5 vector khuôn mặt 512D!`);
      } else {
        showToast('Không phát hiện khuôn mặt rõ nét trong ảnh chụp.', 'error');
      }
    } catch (err) {
      setUploadResult({
        success: false,
        message: err.message || 'Lỗi trích xuất vector khuôn mặt.',
      });
      showToast(err.message || 'Lỗi trích xuất vector', 'error');
    } finally {
      setIsUploadingFaces(false);
    }
  };

  const handleVerifyFaceLive = async () => {
    if (!selectedEmployeeForFace) return;
    setIsVerifyingFace(true);
    setVerifyResult(null);

    try {
      const blob = await api.getDirectCameraSnapshotBlob();
      const filename = `verify_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.verifyEmployeeFace(selectedEmployeeForFace.id, formData);
      const data = res.data || res;
      setVerifyResult(data);
      if (res.success || data.is_verified) {
        showToast(`✅ Xác thực thành công: Độ tin cậy ${data.confidence_percent}%`);
      } else {
        showToast(`❌ Khuôn mặt không khớp (Độ tin cậy: ${data.confidence_percent || 0}%)`, 'error');
      }
    } catch (err) {
      setVerifyResult({
        is_verified: false,
        error: err.message || 'Lỗi khi so khớp khuôn mặt.',
      });
      showToast(err.message || 'Lỗi xác thực', 'error');
    } finally {
      setIsVerifyingFace(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-semibold backdrop-blur-md transition-all ${
            notification.type === 'error'
              ? 'bg-rose-500/90 text-white border border-rose-400'
              : 'bg-emerald-500/90 text-white border border-emerald-400'
          }`}
        >
          {notification.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* TOP UNIFIED HUB BANNER */}
      {/* ------------------------------------------------------------------------ */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl relative overflow-hidden">
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                {t('unified_hr_hub_title', 'HR & Identity Biometrics Hub')}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Face AI 512D • IAM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('unified_hr_hub_sub', 'Comprehensive management of personnel profiles, 512D facial vector extraction, IAM security accounts & organizational structure')}
            </p>
          </div>
        </div>

        {/* Quick KPI Stats Pill */}
        <div className="flex items-center space-x-3 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 text-xs flex-shrink-0">
          <div className="px-3 py-1 text-center border-r border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400">{t('total_personnel', 'Total Personnel')}</div>
            <div className="text-base font-bold text-white font-mono">{unifiedPersonnelList.length}</div>
          </div>
          {canManageOrg && (
            <div className="px-3 py-1 text-center border-r border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400">{t('departments_title', 'Departments')}</div>
              <div className="text-base font-bold text-cyan-400 font-mono">{departments.length}</div>
            </div>
          )}
          {canManageRoles && (
            <div className="px-3 py-1 text-center">
              <div className="text-[10px] uppercase font-semibold text-slate-400">{t('tab_roles', 'RBAC Roles')}</div>
              <div className="text-base font-bold text-purple-400 font-mono">{roles.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* UNIFIED SUB-TABS NAVIGATION */}
      {/* ------------------------------------------------------------------------ */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeTab === 'personnel'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('tab_personnel_faces', 'Personnel & Face AI 512D Roster')} ({unifiedPersonnelList.length})</span>
        </button>

        {canManageRoles && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{t('tab_roles', 'Roles & RBAC Permissions')} ({roles.length})</span>
          </button>
        )}

        {canManageOrg && (
          <button
            onClick={() => setActiveTab('org')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeTab === 'org'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('tab_org', 'Departments & Positions')} ({departments.length} • {positions.length})</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* SUB-TAB 1: UNIFIED PERSONNEL & FACE REGISTRATION ROSTER */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('search_personnel_placeholder', 'Search by name, employee code, email, username...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-white"
                />
              </div>

              {departments.length > 0 && (
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl glass-input text-xs text-white"
                >
                  <option value="">{t('all_departments', '-- All Departments --')}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('btn_add_employee_unified', '+ Add New Personnel')}</span>
            </button>
          </div>

          {/* Unified Personnel Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">{t('th_personnel_profile', 'Personnel Profile')}</th>
                    <th className="p-4">{t('th_contact', 'Contact')}</th>
                    <th className="p-4">{t('th_dept_pos', 'Department / Position')}</th>
                    <th className="p-4">{t('th_iam_account', 'IAM Account & Roles')}</th>
                    <th className="p-4">{t('th_face_status', 'Face AI 512D Biometrics')}</th>
                    <th className="p-4 text-center">{t('status', 'Status')}</th>
                    <th className="p-4 text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPersonnel.map((item) => (
                    <tr key={item.key} className="hover:bg-slate-900/40 transition-all">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-600/20">
                            {item.full_name ? item.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{item.full_name}</div>
                            <div className="text-[11px] font-mono text-indigo-400">{item.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-300 flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.email || '--'}</span>
                        </div>
                        {item.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{item.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-slate-200 font-medium">{item.department || t('unassigned')}</div>
                        <div className="text-[11px] text-slate-400">{item.position || '--'}</div>
                      </td>
                      <td className="p-4">
                        {item.iamUser ? (
                          <div className="space-y-1">
                            <div className="font-mono text-[11px] text-purple-300 font-semibold flex items-center space-x-1">
                              <ShieldCheck className="w-3 h-3 text-purple-400" />
                              <span>@{item.iamUser.username}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(item.roles || []).map((r, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {typeof r === 'string' ? r : r?.display_name || r?.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">{t('no_iam_account', 'No IAM Account')}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.faceCount >= 5 ? (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>{t('status_face_verified_5', 'Đã Xác Thực (5/5 512D)')}</span>
                          </div>
                        ) : item.faceCount > 0 ? (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{t('status_face_registered_partial', 'Đã đăng ký ({count}/5 góc)').replace('{count}', item.faceCount)}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>{t('status_no_face_model', 'Chưa có mẫu Face AI')}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {item.is_active ? t('status_active') : t('status_locked')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Face AI Button */}
                          <button
                            onClick={() => handleOpenFaceForPersonnel(item)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/40 text-indigo-300 hover:text-white transition-all text-xs font-semibold shadow-sm"
                            title="Register 5 Face Angles"
                          >
                            <Camera className="w-3.5 h-3.5 text-cyan-300" />
                            <span>{t('btn_face_ai', 'Face AI')}</span>
                          </button>

                          {/* Edit Employee Button */}
                          <button
                            onClick={() => openEditPersonnelModal(item)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all"
                            title="Chỉnh sửa thông tin nhân viên & tài khoản"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeletePersonnel(item)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPersonnel.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        {t('no_employees_found', 'No personnel records found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* SUB-TAB 2: SYSTEM ROLES & PERMISSIONS MATRIX */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>{t('roles_list_title', 'Roles Directory')} ({roles.length})</span>
              </h3>
              <button
                onClick={openCreateRoleModal}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-purple-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('btn_add_role', 'Add Role')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {roles.map((r) => (
                <div key={r.id} className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{r.display_name}</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                        {r.name}
                      </span>
                      <button
                        onClick={() => openEditRoleModal(r)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all"
                        title={t('edit_role_title', 'Edit Role')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {!r.is_system && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{r.description || t('no_desc')}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <span>{t('permissions_unit', 'Permissions')}: <strong className="text-purple-300">{(r.permissions || []).length}</strong></span>
                    {r.is_system && <span className="text-[10px] text-amber-400 font-semibold">{t('system_role', 'System')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>{t('system_permissions_title', 'System Permissions Matrix')} ({permissions.length})</span>
            </h3>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              {['core_user', 'attendance', 'hrm', 'helpdesk'].map((mod) => {
                const modPerms = permissions.filter((p) => p.module === mod);
                return (
                  <div key={mod} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 flex items-center space-x-1.5">
                      <span>{t('module_label', 'Module:')} {mod.toUpperCase()}</span>
                      <span className="text-slate-400 font-normal">({modPerms.length} {t('permissions_unit', 'permissions')})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modPerms.map((p) => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-white text-xs">{p.name}</div>
                            <div className="font-mono text-[10px] text-slate-400">{p.code}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{p.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* SUB-TAB 3: DEPARTMENTS & POSITIONS (Full CRUD) */}
      {/* ------------------------------------------------------------------------ */}
      {activeTab === 'org' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>{t('departments_title', 'Departments')} ({departments.length})</span>
              </h3>
              <button
                onClick={openCreateDeptModal}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('btn_add_dept', '+ Add Department')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {departments.map((d) => (
                <div key={d.id} className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{d.name}</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {d.code}
                      </span>
                      <button
                        onClick={() => openEditDeptModal(d)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-all"
                        title={t('edit_dept_title', 'Edit Department')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(d)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{d.description || t('no_desc')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Positions & Ranks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <span>{t('positions_title', 'Positions & Ranks')} ({positions.length})</span>
              </h3>
              <button
                onClick={openCreatePosModal}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-amber-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('btn_add_pos', '+ Add Position')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {positions.map((p) => (
                <div key={p.id} className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{p.name}</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {t('rank_level_label', 'Rank')} {p.level} • {p.code}
                      </span>
                      <button
                        onClick={() => openEditPosModal(p)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition-all"
                        title={t('edit_pos_title', 'Edit Position')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePos(p)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{p.description || t('no_desc')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL 1: ADD UNIFIED EMPLOYEE & IAM ACCOUNT */}
      {/* ------------------------------------------------------------------------ */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>{t('modal_add_employee_unified_title', 'Create Personnel Profile & Security Account')}</span>
              </h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {empFormError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{empFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUnifiedEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('employee_code_label', 'Employee Code (User Code) *')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP001"
                    value={newEmpForm.employee_code}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, employee_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('full_name_label', 'Full Name *')}</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={newEmpForm.full_name}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('email_label', 'Email *')}</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={newEmpForm.email}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('phone', 'Phone Number')}</label>
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={newEmpForm.phone_number}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('department_label', 'Department *')}</label>
                  {departments.length > 0 ? (
                    <select
                      required
                      value={newEmpForm.department}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    >
                      <option value="">{t('select_dept', '-- Select Department --')}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI Engineering"
                      value={newEmpForm.department}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">{t('position_label', 'Position *')}</label>
                  {positions.length > 0 ? (
                    <select
                      required
                      value={newEmpForm.position}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, position: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    >
                      <option value="">{t('select_pos', '-- Select Position --')}</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.name}>{p.name} ({t('rank_level_label', 'Level')} {p.level})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior AI Engineer"
                      value={newEmpForm.position}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, position: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    />
                  )}
                </div>
              </div>

              {/* IAM System Account Options */}
              <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 space-y-3">
                <label className="flex items-center space-x-2 text-white font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEmpForm.create_iam_account}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, create_iam_account: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>{t('create_iam_account_chk', 'Create Core User & IAM Login Account')}</span>
                </label>

                {newEmpForm.create_iam_account && (
                  <div className="space-y-3 pt-1 border-t border-slate-800/80">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">{t('username', 'Username *')}</label>
                        <input
                          type="text"
                          required={newEmpForm.create_iam_account}
                          placeholder="john.doe"
                          value={newEmpForm.username}
                          onChange={(e) => setNewEmpForm({ ...newEmpForm, username: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl glass-input text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1">{t('password', 'Password *')}</label>
                        <input
                          type="password"
                          required={newEmpForm.create_iam_account}
                          placeholder="Min 6 characters"
                          value={newEmpForm.password}
                          onChange={(e) => setNewEmpForm({ ...newEmpForm, password: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl glass-input text-white"
                        />
                      </div>
                    </div>

                    {/* Roles Assignment */}
                    <div>
                      <label className="block text-slate-300 mb-1">{t('th_roles', 'Assign Roles')}</label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {roles.map((r) => {
                          const isSelected = newEmpForm.role_ids.includes(r.id);
                          return (
                            <button
                              type="button"
                              key={r.id}
                              onClick={() => {
                                if (isSelected) {
                                  setNewEmpForm({
                                    ...newEmpForm,
                                    role_ids: newEmpForm.role_ids.filter((id) => id !== r.id),
                                  });
                                } else {
                                  setNewEmpForm({
                                    ...newEmpForm,
                                    role_ids: [...newEmpForm.role_ids, r.id],
                                  });
                                }
                              }}
                              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              {r.display_name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmp}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmittingEmp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('btn_save_employee_unified', 'Save Profile & Register Face AI')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL: EDIT PERSONNEL & IAM ACCOUNT */}
      {/* ------------------------------------------------------------------------ */}
      {showEditEmployeeModal && editingPersonnel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit className="w-5 h-5 text-indigo-400" />
                <span>Chỉnh Sửa Hồ Sơ & Tài Khoản: {editingPersonnel.code}</span>
              </h3>
              <button onClick={() => setShowEditEmployeeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePersonnel} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('employee_code_label', 'Mã nhân viên (User Code)')}</label>
                  <input
                    type="text"
                    disabled
                    value={editingPersonnel.code}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-400 font-mono disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('full_name_label', 'Họ và tên *')}</label>
                  <input
                    type="text"
                    required
                    value={editEmpForm.full_name}
                    onChange={(e) => setEditEmpForm({ ...editEmpForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('email_label', 'Email *')}</label>
                  <input
                    type="email"
                    required
                    value={editEmpForm.email}
                    onChange={(e) => setEditEmpForm({ ...editEmpForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('phone', 'Số điện thoại')}</label>
                  <input
                    type="text"
                    value={editEmpForm.phone_number}
                    onChange={(e) => setEditEmpForm({ ...editEmpForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('department_label', 'Phòng ban *')}</label>
                  {departments.length > 0 ? (
                    <select
                      required
                      value={editEmpForm.department}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    >
                      <option value="">{t('select_dept', '-- Chọn phòng ban --')}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={editEmpForm.department}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">{t('position_label', 'Chức vụ *')}</label>
                  {positions.length > 0 ? (
                    <select
                      required
                      value={editEmpForm.position}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, position: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    >
                      <option value="">{t('select_pos', '-- Chọn chức vụ --')}</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.name}>{p.name} ({t('rank_level_label', 'Cấp')} {p.level})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={editEmpForm.position}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, position: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    />
                  )}
                </div>
              </div>

              {/* Status active toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Trạng thái hoạt động</div>
                  <div className="text-[11px] text-slate-400">Cho phép chấm công AI và đăng nhập hệ thống</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEmpForm.is_active}
                    onChange={(e) => setEditEmpForm({ ...editEmpForm, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* IAM Account Settings */}
              {editingPersonnel.iamUser && (
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-300 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>Tài khoản IAM: @{editingPersonnel.iamUser.username}</span>
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Đặt lại mật khẩu mới (để trống nếu không đổi)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu mới..."
                      value={editEmpForm.password}
                      onChange={(e) => setEditEmpForm({ ...editEmpForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">{t('th_roles', 'Gán Vai Trò (Roles)')}</label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {roles.map((r) => {
                        const isSelected = editEmpForm.role_ids.includes(r.id);
                        return (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => {
                              if (isSelected) {
                                setEditEmpForm({
                                  ...editEmpForm,
                                  role_ids: editEmpForm.role_ids.filter((id) => id !== r.id),
                                });
                              } else {
                                setEditEmpForm({
                                  ...editEmpForm,
                                  role_ids: [...editEmpForm.role_ids, r.id],
                                });
                              }
                            }}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {r.display_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEmp}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isUpdatingEmp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('update_btn', 'Cập Nhật')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL 2: ADD / EDIT ROLE */}
      {/* ------------------------------------------------------------------------ */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <span>{editingRole ? `${t('edit_role_title', 'Edit Role')}: ${editingRole.display_name}` : t('create_role_title', 'Create New RBAC Role')}</span>
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('role_code_label', 'Role Code *')}</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRole}
                    placeholder="e.g. auditor, supervisor"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('role_name_label', 'Role Display Name *')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shift Supervisor"
                    value={roleForm.display_name}
                    onChange={(e) => setRoleForm({ ...roleForm, display_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('role_desc_label', 'Role Description')}</label>
                <input
                  type="text"
                  placeholder="Describe role responsibilities and privileges..."
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-2 font-semibold flex items-center justify-between">
                  <span>{t('select_permissions_label', 'Select System Permissions')}</span>
                  <span className="text-purple-400 font-mono">
                    {roleForm.permission_ids.length} / {permissions.length} {t('selected_count', 'selected')}
                  </span>
                </label>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {['core_user', 'attendance', 'hrm', 'helpdesk'].map((mod) => {
                    const modPerms = permissions.filter((p) => p.module === mod);
                    if (modPerms.length === 0) return null;
                    return (
                      <div key={mod} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>{t('module_label', 'Module:')} {mod.toUpperCase()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const modPermIds = modPerms.map((p) => p.id);
                              const allSelected = modPermIds.every((id) => roleForm.permission_ids.includes(id));
                              if (allSelected) {
                                setRoleForm({
                                  ...roleForm,
                                  permission_ids: roleForm.permission_ids.filter((id) => !modPermIds.includes(id)),
                                });
                              } else {
                                const newIds = Array.from(new Set([...roleForm.permission_ids, ...modPermIds]));
                                setRoleForm({ ...roleForm, permission_ids: newIds });
                              }
                            }}
                            className="text-[10px] text-purple-400 hover:text-purple-300 lowercase"
                          >
                            {t('select_all_deselect', 'select all / deselect all')}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {modPerms.map((p) => {
                            const isChecked = roleForm.permission_ids.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`p-2 rounded-xl border flex items-start space-x-2 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-purple-950/40 border-purple-500/50 text-white'
                                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setRoleForm({
                                        ...roleForm,
                                        permission_ids: roleForm.permission_ids.filter((id) => id !== p.id),
                                      });
                                    } else {
                                      setRoleForm({
                                        ...roleForm,
                                        permission_ids: [...roleForm.permission_ids, p.id],
                                      });
                                    }
                                  }}
                                  className="mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-0"
                                />
                                <div className="leading-tight">
                                  <div className="font-semibold text-xs text-white">{p.name}</div>
                                  <div className="font-mono text-[9px] text-slate-400">{p.code}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30"
                >
                  {editingRole ? t('update_btn', 'Update Role') : t('save_btn', 'Save Role')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL 3: ADD / EDIT DEPARTMENT */}
      {/* ------------------------------------------------------------------------ */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <span>{editingDept ? `${t('edit_dept_title', 'Edit Department')}: ${editingDept.name}` : t('create_dept_title', 'Create New Department')}</span>
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{t('dept_code_label', 'Department Code *')}</label>
                <input
                  type="text"
                  required
                  disabled={!!editingDept}
                  placeholder="e.g. IT_DEV, HR_OPS"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('dept_name_label', 'Department Name *')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Engineering & Cloud"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('dept_desc_label', 'Description / Notes')}</label>
                <input
                  type="text"
                  placeholder="Department scope and responsibilities..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/30"
                >
                  {editingDept ? t('update_btn', 'Update') : t('save_btn', 'Save Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL 4: ADD / EDIT POSITION */}
      {/* ------------------------------------------------------------------------ */}
      {showPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                <span>{editingPos ? `${t('edit_pos_title', 'Edit Position')}: ${editingPos.name}` : t('create_pos_title', 'Create New Position')}</span>
              </h3>
              <button onClick={() => setShowPosModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePos} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{t('pos_code_label', 'Position Code *')}</label>
                <input
                  type="text"
                  required
                  disabled={!!editingPos}
                  placeholder="e.g. LEAD_DEV, HR_DIR"
                  value={posForm.code}
                  onChange={(e) => setPosForm({ ...posForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('pos_name_label', 'Position Title *')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead AI Architect"
                  value={posForm.name}
                  onChange={(e) => setPosForm({ ...posForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('rank_level_label', 'Rank Level (Level 1 - 10)')}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={posForm.level}
                  onChange={(e) => setPosForm({ ...posForm, level: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('pos_desc_label', 'Position Description')}</label>
                <input
                  type="text"
                  placeholder="Responsibilities and job expectations..."
                  value={posForm.description}
                  onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPosModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-600/30"
                >
                  {editingPos ? t('update_btn', 'Update') : t('save_btn', 'Save Position')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL 5: 5-ANGLE MULTI-TEMPLATE FACE REGISTRATION */}
      {/* ------------------------------------------------------------------------ */}
      {showFaceRegModal && selectedEmployeeForFace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-slate-700 relative max-h-[90vh] flex flex-col my-auto">
            <button
              onClick={closeRegisterFaceModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>{t('modal_face_reg_title', '5-Angle Biometric Face Registration')}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {t('full_name', 'Personnel')}: <strong className="text-white">{selectedEmployeeForFace.full_name}</strong> ({t('employee_code', 'Code')}: <span className="font-mono text-indigo-400">{selectedEmployeeForFace.employee_code}</span>)
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setRegMode('backend_cam')}
                  className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-semibold transition-all ${
                    regMode === 'backend_cam' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t('capture_from_camera', 'Direct Camera (Backend)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegMode('manual_upload')}
                  className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-xl font-semibold transition-all ${
                    regMode === 'manual_upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('upload_from_disk', 'Upload Files From Disk')}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 text-xs">{t('status', 'Progress')}:</span>
                <span className={`font-mono font-bold text-xs ${isAllAnglesReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {readyPhotosCount} / 5
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 overflow-y-auto pr-1">
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="relative w-full aspect-video bg-black/80 rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                  {regMode === 'backend_cam' && (
                    <img
                      key={feedTimestamp}
                      src={`http://localhost:8000/api/v1/camera/video_feed?raw=true&t=${feedTimestamp}`}
                      alt="Live Stream Feed"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}

                  {regMode === 'manual_upload' && (
                    <div className="text-center p-6 text-slate-400 space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-indigo-400 opacity-60" />
                      <p className="text-xs">Select each angle slot on the right to upload corresponding photo.</p>
                    </div>
                  )}

                  {/* Top Floating Active Guidance Header */}
                  {regMode === 'backend_cam' && (
                    <div className="absolute top-3 inset-x-3 pointer-events-none flex items-center justify-center z-20">
                      <div className="px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/60 shadow-2xl flex items-center space-x-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                        <span className="text-[11px] font-extrabold tracking-wider text-cyan-200 uppercase">
                          {FACE_ANGLES[activeAngleIndex]?.instruction}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Dynamic Pose Guidance Overlay */}
                  {regMode === 'backend_cam' && (
                    <>
                      {FACE_ANGLES[activeAngleIndex]?.guideType === 'center' && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-cyan-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                            <div className="w-40 h-56 rounded-[42%] border border-cyan-500/40" />
                            <div className="absolute w-8 h-8 rounded-full border-2 border-cyan-300 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            </div>
                          </div>
                        </div>
                      )}

                      {FACE_ANGLES[activeAngleIndex]?.guideType === 'left' && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-6 z-10">
                          <div className="flex flex-col items-center space-y-1.5 animate-bounce bg-purple-950/85 p-3.5 rounded-2xl border-2 border-purple-400 shadow-2xl">
                            <ArrowLeft className="w-8 h-8 text-purple-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_turn_left', 'QUAY TRÁI')}</span>
                          </div>
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-purple-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]" />
                        </div>
                      )}

                      {FACE_ANGLES[activeAngleIndex]?.guideType === 'right' && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-6 z-10">
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-blue-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)]" />
                          <div className="flex flex-col items-center space-y-1.5 animate-bounce bg-blue-950/85 p-3.5 rounded-2xl border-2 border-blue-400 shadow-2xl">
                            <ArrowRight className="w-8 h-8 text-blue-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_turn_right', 'QUAY PHẢI')}</span>
                          </div>
                        </div>
                      )}

                      {FACE_ANGLES[activeAngleIndex]?.guideType === 'down' && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-amber-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.4)]" />
                          <div className="absolute bottom-3.5 flex items-center space-x-2 animate-bounce bg-amber-950/85 px-4 py-2 rounded-2xl border-2 border-amber-400 shadow-2xl">
                            <ArrowDown className="w-5 h-5 text-amber-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_tilt_down', 'HƠI CÚI CẰM XUỐNG')}</span>
                          </div>
                        </div>
                      )}

                      {FACE_ANGLES[activeAngleIndex]?.guideType === 'up' && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                          <div className="absolute top-14 flex items-center space-x-2 animate-bounce bg-emerald-950/85 px-4 py-2 rounded-2xl border-2 border-emerald-400 shadow-2xl">
                            <ArrowUp className="w-5 h-5 text-emerald-300" />
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('hud_look_up_smile', 'NGẨNG LÊN & CƯỜI TƯƠI ✨')}</span>
                          </div>
                          <div className="w-48 h-64 rounded-[42%] border-2 border-dashed border-emerald-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]" />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Direct Angle Quick Selection Strip */}
                <div className="flex items-center space-x-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                  {FACE_ANGLES.map((angle, idx) => {
                    const isReady = !!angleFiles[angle.id];
                    const isActive = idx === activeAngleIndex;
                    return (
                      <button
                        type="button"
                        key={angle.id}
                        onClick={() => setActiveAngleIndex(idx)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center space-x-1 ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                            : isReady
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{angle.step}. {angle.badge.split(' ')[0]}</span>
                        {isReady && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {regMode === 'backend_cam' && (
                  <button
                    type="button"
                    onClick={captureBackendSnapshot}
                    disabled={isCapturingSnapshot}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xl shadow-indigo-600/30 transition-all"
                  >
                    {isCapturingSnapshot ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <span>
                      {t('capture_angle_btn', 'Chụp Góc {angle}: {title}')
                        .replace('{angle}', activeAngleIndex + 1)
                        .replace('{title}', FACE_ANGLES[activeAngleIndex]?.title || '')}
                    </span>
                  </button>
                )}
              </div>

              <div className="md:col-span-5 space-y-2.5">
                {FACE_ANGLES.map((angle, idx) => {
                  const isReady = !!angleFiles[angle.id];
                  const preview = anglePreviews[angle.id];
                  const isActive = idx === activeAngleIndex;

                  return (
                    <div
                      key={angle.id}
                      onClick={() => setActiveAngleIndex(idx)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                          : isReady
                          ? 'bg-slate-900/80 border-emerald-500/40'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {preview ? (
                          <img src={preview} alt="Angle" className="w-10 h-10 rounded-xl object-cover border border-emerald-500/50" />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {angle.step}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="font-semibold text-xs text-white truncate">{angle.title}</div>
                          <div className="text-[10px] text-slate-400 truncate">{angle.badge}</div>
                        </div>
                      </div>

                      {regMode === 'manual_upload' && (
                        <label className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <input type="file" accept="image/*" onChange={(e) => handleManualUpload(angle.id, e)} className="hidden" />
                        </label>
                      )}

                      {isReady && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Result & Verification Feedback Panel */}
            {uploadResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                uploadResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {uploadResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
                    <span>{uploadResult.message}</span>
                  </div>
                  {uploadResult.success && (
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {uploadResult.total_registered} / {uploadResult.total_uploaded || 5} góc thành công
                    </span>
                  )}
                </div>

                {uploadResult.success && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-emerald-500/20">
                    <p className="text-[11px] text-emerald-300/80">
                      {t('result_pgvector_note', 'Hệ thống đã lưu 5 vector 512 chiều vào PostgreSQL pgvector. Hãy kiểm tra xác thực trực tiếp trước camera:')}
                    </p>
                    <button
                      type="button"
                      onClick={handleVerifyFaceLive}
                      disabled={isVerifyingFace}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 flex-shrink-0 disabled:opacity-50"
                    >
                      {isVerifyingFace ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-cyan-200" />}
                      <span>{isVerifyingFace ? t('verifying_matching', 'Đang so khớp...') : t('btn_verify_now', '🔍 Kiểm Tra & Xác Thực Ngay')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Live Verification Result Box */}
            {verifyResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                verifyResult.is_verified
                  ? 'bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border-emerald-400 shadow-xl text-white'
                  : 'bg-rose-950/50 border-rose-500 text-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {verifyResult.is_verified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span>
                      {verifyResult.is_verified
                        ? t('result_verify_success_title', '🎉 XÁC THỰC THÀNH CÔNG: Khớp {percent}%').replace('{percent}', verifyResult.confidence_percent)
                        : t('result_verify_fail_title', '❌ XÁC THỰC THẤT BẠI: Độ tin cậy {percent}%').replace('{percent}', verifyResult.confidence_percent || 0)}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                    Sim: {verifyResult.similarity_score || '--'} (Ngưỡng: {verifyResult.threshold || 0.6})
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {verifyResult.is_verified
                    ? t('result_verify_success_desc', 'Khuôn mặt trực tiếp khớp chính xác với hồ sơ nhân sự của {name} ({code}). Nhân viên đã sẵn sàng để chấm công tự động!')
                        .replace('{name}', verifyResult.full_name)
                        .replace('{code}', verifyResult.employee_code)
                    : t('result_verify_fail_desc', 'Khuôn mặt hiện tại không khớp với 5 mẫu vector đã lưu. Vui lòng nhìn thẳng vào camera và thử xác thực lại.')}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4 flex-shrink-0">
              <button
                type="button"
                onClick={closeRegisterFaceModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {t('cancel')}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleVerifyFaceLive}
                  disabled={isVerifyingFace || (!uploadResult && readyPhotosCount < 5)}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-40"
                  title="Chụp 1 khung hình camera và kiểm tra độ khớp ngay"
                >
                  {isVerifyingFace ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-cyan-300" />}
                  <span>{t('btn_verify_short', 'Kiểm Tra Xác Thực')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave5AnglesFaceVectors}
                  disabled={!isAllAnglesReady || isUploadingFaces}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isUploadingFaces && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <Sparkles className="w-4 h-4" />
                  <span>{t('save_5_vectors_btn', 'Trích Xuất & Lưu 5 Vector 512D')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedHRHub;
