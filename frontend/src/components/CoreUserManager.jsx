import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Building2, 
  Briefcase, 
  Key, 
  UserPlus, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Plus, 
  UserCheck, 
  Shield, 
  Mail, 
  Phone, 
  FileText,
  LogOut,
  LogIn
} from 'lucide-react';
import api from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

const CoreUserManager = () => {
  const { t } = useI18n();
  const { currentUser, logout: handleLogout } = useAuth();

  // Sub-tabs in Core User Manager
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users', 'roles', 'org'

  // Users State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    user_code: '',
    phone: '',
    department_id: '',
    position_id: '',
    role_ids: [],
  });

  // Roles & Permissions State
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    permission_ids: [],
  });

  // Organization State (Departments & Positions)
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [newDeptForm, setNewDeptForm] = useState({ code: '', name: '', description: '' });
  const [newPosForm, setNewPosForm] = useState({ code: '', name: '', level: 1, description: '' });
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddPosModal, setShowAddPosModal] = useState(false);

  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.getCoreUsers({ search: userSearch || undefined, limit: 100 });
      const userList = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
      setUsers(userList);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch]);

  // Fetch Roles & Permissions
  const fetchRbac = useCallback(async () => {
    setRolesLoading(true);
    try {
      const [roleRes, permRes] = await Promise.all([
        api.getRoles(),
        api.getPermissions(),
      ]);
      const roleList = Array.isArray(roleRes) ? roleRes : (roleRes?.data || []);
      const permList = Array.isArray(permRes) ? permRes : (permRes?.data || []);
      setRoles(roleList);
      setPermissions(permList);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // Fetch Org Data
  const fetchOrg = useCallback(async () => {
    setOrgLoading(true);
    try {
      const [deptRes, posRes] = await Promise.all([
        api.getDepartments(),
        api.getPositions(),
      ]);
      const deptList = Array.isArray(deptRes) ? deptRes : (deptRes?.data || []);
      const posList = Array.isArray(posRes) ? posRes : (posRes?.data || []);
      setDepartments(deptList);
      setPositions(posList);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRbac();
    fetchOrg();
  }, [fetchUsers, fetchRbac, fetchOrg]);

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        username: newUserForm.username.trim(),
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        full_name: newUserForm.full_name.trim(),
        user_code: newUserForm.user_code?.trim() || `EMP_${Date.now().toString().slice(-4)}`,
        phone_number: newUserForm.phone?.trim() || null,
        department_id: newUserForm.department_id || null,
        position_id: newUserForm.position_id || null,
        role_ids: newUserForm.role_ids.length > 0 ? newUserForm.role_ids : [],
      };
      await api.createCoreUser(payload);
      showToast(`Đã tạo tài khoản "${newUserForm.username}" thành công!`);
      setShowAddUserModal(false);
      setNewUserForm({
        username: '',
        email: '',
        password: '',
        full_name: '',
        user_code: '',
        phone: '',
        department_id: '',
        position_id: '',
        role_ids: [],
      });
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo tài khoản', 'error');
    }
  };

  // Create Department
  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: newDeptForm.code.trim().toUpperCase(),
        name: newDeptForm.name.trim(),
        description: newDeptForm.description?.trim() || null,
      };
      await api.createDepartment(payload);
      showToast(`Đã tạo phòng ban "${newDeptForm.name}" thành công!`);
      setShowAddDeptModal(false);
      setNewDeptForm({ code: '', name: '', description: '' });
      fetchOrg();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Create Position
  const handleCreatePos = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: newPosForm.code.trim().toUpperCase(),
        name: newPosForm.name.trim(),
        level: parseInt(newPosForm.level) || 1,
        description: newPosForm.description?.trim() || null,
      };
      await api.createPosition(payload);
      showToast(`Đã tạo chức vụ "${newPosForm.name}" thành công!`);
      setShowAddPosModal(false);
      setNewPosForm({ code: '', name: '', level: 1, description: '' });
      fetchOrg();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Create Custom Role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newRoleForm.name.trim().toLowerCase().replace(/\s+/g, '_'),
        display_name: newRoleForm.display_name.trim(),
        description: newRoleForm.description?.trim() || null,
        permission_ids: newRoleForm.permission_ids,
      };
      await api.createRole(payload);
      showToast(`Đã tạo vai trò "${payload.display_name}" thành công!`);
      setShowAddRoleModal(false);
      setNewRoleForm({ name: '', display_name: '', description: '', permission_ids: [] });
      fetchRbac();
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo vai trò', 'error');
    }
  };

  // Delete Custom Role
  const handleDeleteRole = async (role) => {
    if (role.is_system) {
      showToast('Không thể xóa vai trò mặc định của hệ thống!', 'error');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.display_name}" không?`)) {
      return;
    }
    try {
      await api.deleteRole(role.id);
      showToast(`Đã xóa vai trò "${role.display_name}" thành công!`);
      fetchRbac();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa vai trò', 'error');
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

      {/* Top Banner: IAM Status & Active Administrator Profile */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-wide">{t('iam_title')}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Port 8001
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('iam_sub')}
            </p>
          </div>
        </div>

        {/* Current Auth User Badge */}
        {currentUser && (
          <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-600/20">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">{currentUser?.full_name || currentUser?.username || 'User'}</div>
              <div className="text-[10px] text-indigo-400 flex items-center space-x-1">
                <span>
                  {typeof (currentUser?.roles || [])[0] === 'string'
                    ? (currentUser?.roles || [])[0]
                    : ((currentUser?.roles || [])[0]?.display_name || (currentUser?.roles || [])[0]?.name || 'superadmin')}
                </span>
                <span>•</span>
                <span className="font-mono text-slate-400">{currentUser?.user_code || 'EMP000'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeSubTab === 'users'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('tab_users')} ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeSubTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{t('tab_roles')} ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('org')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeSubTab === 'org'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{t('tab_org')}</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* SUB-TAB 1: USERS & PROFILES */}
      {/* ------------------------------------------------------------------------ */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={t('search_user_placeholder')}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={fetchUsers}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                title={t('refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all flex-1 sm:flex-none justify-center"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('btn_add_user')}</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">{t('th_user_code')}</th>
                    <th className="p-4">{t('th_email_phone')}</th>
                    <th className="p-4">{t('th_dept_pos')}</th>
                    <th className="p-4">{t('th_roles')}</th>
                    <th className="p-4 text-center">{t('th_status')}</th>
                    <th className="p-4 text-right">{t('th_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => {
                    const fullName = u.profile?.full_name || u.full_name || u.username;
                    const phone = u.profile?.phone_number || u.phone;
                    const deptName = u.department?.name || u.department_name || t('unassigned');
                    const posName = u.position?.name || u.position_name || '--';
                    const userRoles = (u.roles || []).map((r) =>
                      typeof r === 'string' ? r : (r?.display_name || r?.name || '')
                    );

                    return (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition-all">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white text-xs">
                              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{fullName}</div>
                              <div className="text-[11px] font-mono text-indigo-400">{u.user_code || '@' + u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-300 flex items-center space-x-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.email || '--'}</span>
                          </div>
                          {phone && (
                            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-slate-200 font-medium">{deptName}</div>
                          <div className="text-[11px] text-slate-400">{posName}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {userRoles.map((roleText, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {roleText}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            u.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {u.is_active ? t('status_active') : t('status_locked')}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={async () => {
                              if (window.confirm(`${t('delete')} "${u.username}"?`)) {
                                try {
                                  await api.deleteCoreUser(u.id);
                                  showToast(`${t('delete')} "${u.username}"`);
                                  fetchUsers();
                                } catch (err) {
                                  showToast(err.message, 'error');
                                }
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        {t('no_users_found')}
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
      {/* SUB-TAB 2: RBAC ROLES & PERMISSIONS */}
      {/* ------------------------------------------------------------------------ */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>{t('roles_list_title')} ({roles.length})</span>
              </h3>
              <button
                onClick={() => setShowAddRoleModal(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-purple-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('btn_add_role', 'Thêm Vai Trò')}</span>
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
                      {!r.is_system && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{r.description || t('no_desc')}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <span>{t('th_roles')}: <strong className="text-purple-300">{(r.permissions || []).length} {t('permissions_count')}</strong></span>
                    {r.is_system && <span className="text-[10px] text-amber-400 font-semibold">{t('system_role')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>{t('system_permissions_title')} ({permissions.length})</span>
            </h3>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              {['core_user', 'attendance', 'hrm', 'helpdesk'].map((mod) => {
                const modPerms = permissions.filter((p) => p.module === mod);
                return (
                  <div key={mod} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 flex items-center space-x-1.5">
                      <span>{t('module_label')} {mod.toUpperCase()}</span>
                      <span className="text-slate-400 font-normal">({modPerms.length} {t('permissions_count')})</span>
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
      {/* SUB-TAB 3: ORGANIZATION (DEPARTMENTS & POSITIONS) */}
      {/* ------------------------------------------------------------------------ */}
      {activeSubTab === 'org' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>{t('departments_title')} ({departments.length})</span>
              </h3>
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('btn_add_dept')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {departments.map((d) => (
                <div key={d.id} className="glass-panel p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{d.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {d.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{d.description || t('no_desc')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Positions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <span>{t('positions_title')} ({positions.length})</span>
              </h3>
              <button
                onClick={() => setShowAddPosModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-amber-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('btn_add_pos')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {positions.map((p) => (
                <div key={p.id} className="glass-panel p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{p.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Level {p.level} • {p.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{p.description || t('no_desc')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL: ADD NEW USER */}
      {/* ------------------------------------------------------------------------ */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <span>{t('modal_add_user_title')}</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_username')}</label>
                  <input
                    type="text"
                    required
                    placeholder="nguyen.van.a"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_password')}</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_fullname')}</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_user_code')}</label>
                  <input
                    type="text"
                    placeholder="EMP001"
                    value={newUserForm.user_code}
                    onChange={(e) => setNewUserForm({ ...newUserForm, user_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_email')}</label>
                  <input
                    type="email"
                    required
                    placeholder="a@company.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_phone')}</label>
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_dept')}</label>
                  <select
                    value={newUserForm.department_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  >
                    <option value="">{t('select_dept')}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_pos')}</label>
                  <select
                    value={newUserForm.position_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, position_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  >
                    <option value="">{t('select_pos')}</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (Lvl {p.level})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_assign_roles')}</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {roles.map((r) => {
                    const isSelected = newUserForm.role_ids.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => {
                          if (isSelected) {
                            setNewUserForm({
                              ...newUserForm,
                              role_ids: newUserForm.role_ids.filter((id) => id !== r.id),
                            });
                          } else {
                            setNewUserForm({
                              ...newUserForm,
                              role_ids: [...newUserForm.role_ids, r.id],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {r.display_name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {t('btn_save_user')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL: ADD DEPARTMENT */}
      {/* ------------------------------------------------------------------------ */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <span>{t('modal_add_dept_title')}</span>
            </h3>

            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_dept_code')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT_DEV, HR_DEPT"
                  value={newDeptForm.code}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_dept_name')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Engineering & IT"
                  value={newDeptForm.name}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_dept_desc')}</label>
                <input
                  type="text"
                  placeholder="Department details..."
                  value={newDeptForm.description}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  {t('btn_save_dept')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL: ADD POSITION */}
      {/* ------------------------------------------------------------------------ */}
      {showAddPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-amber-400" />
              <span>{t('modal_add_pos_title')}</span>
            </h3>

            <form onSubmit={handleCreatePos} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_pos_code')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SENIOR_DEV, HR_LEAD"
                  value={newPosForm.code}
                  onChange={(e) => setNewPosForm({ ...newPosForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_pos_name')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead AI Specialist"
                  value={newPosForm.name}
                  onChange={(e) => setNewPosForm({ ...newPosForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_pos_level')}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newPosForm.level}
                  onChange={(e) => setNewPosForm({ ...newPosForm, level: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPosModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  {t('btn_save_pos')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL: ADD CUSTOM ROLE */}
      {/* ------------------------------------------------------------------------ */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <span>{t('modal_add_role_title', 'Tạo Vai Trò (RBAC Role) Mới')}</span>
            </h3>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_role_code', 'Mã vai trò (e.g. auditor) *')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. lead_auditor, shift_supervisor"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{t('lbl_role_name', 'Tên hiển thị vai trò *')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Trưởng Nhóm Kiểm Toán"
                    value={newRoleForm.display_name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, display_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{t('lbl_role_desc', 'Mô tả vai trò')}</label>
                <input
                  type="text"
                  placeholder="Mô tả phạm vi trách nhiệm và quyền hạn..."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-2 font-semibold flex items-center justify-between">
                  <span>{t('lbl_assign_permissions', 'Chọn các quyền hạn hệ thống (Permissions)')}</span>
                  <span className="text-purple-400 font-mono">
                    {newRoleForm.permission_ids.length} / {permissions.length} đã chọn
                  </span>
                </label>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {['core_user', 'attendance', 'hrm', 'helpdesk'].map((mod) => {
                    const modPerms = permissions.filter((p) => p.module === mod);
                    if (modPerms.length === 0) return null;
                    return (
                      <div key={mod} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>{t('module_label', 'Phân hệ:')} {mod.toUpperCase()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const modPermIds = modPerms.map((p) => p.id);
                              const allSelected = modPermIds.every((id) => newRoleForm.permission_ids.includes(id));
                              if (allSelected) {
                                setNewRoleForm({
                                  ...newRoleForm,
                                  permission_ids: newRoleForm.permission_ids.filter((id) => !modPermIds.includes(id)),
                                });
                              } else {
                                const newIds = Array.from(new Set([...newRoleForm.permission_ids, ...modPermIds]));
                                setNewRoleForm({ ...newRoleForm, permission_ids: newIds });
                              }
                            }}
                            className="text-[10px] text-purple-400 hover:text-purple-300 lowercase"
                          >
                            chọn tất cả / bỏ chọn
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {modPerms.map((p) => {
                            const isChecked = newRoleForm.permission_ids.includes(p.id);
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
                                      setNewRoleForm({
                                        ...newRoleForm,
                                        permission_ids: newRoleForm.permission_ids.filter((id) => id !== p.id),
                                      });
                                    } else {
                                      setNewRoleForm({
                                        ...newRoleForm,
                                        permission_ids: [...newRoleForm.permission_ids, p.id],
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
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30"
                >
                  {t('btn_save_role', 'Lưu Vai Trò')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoreUserManager;
