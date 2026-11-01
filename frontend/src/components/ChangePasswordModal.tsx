import React, { useState } from 'react';
import { apiService } from '../utils/apiService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  userId?: number;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  userId,
  onClose,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword.trim()) {
      setError('请输入原密码');
      return;
    }
    if (!newPassword.trim()) {
      setError('请输入新密码');
      return;
    }
    if (newPassword.trim().length < 3) {
      setError('新密码长度不能少于3个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致，请核对');
      return;
    }

    setLoading(true);
    try {
      const targetId = userId || 1;
      await apiService.changePassword(targetId, oldPassword.trim(), newPassword.trim());
      setSuccess('密码修改成功！下次登录或家长校验时请使用新密码。');
      setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || '修改密码失败，请核对原密码');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#131B2E] border border-cyan-500/40 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_40px_rgba(6,182,212,0.25)] space-y-4 font-mono relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔐</span>
            <div>
              <h3 className="text-sm font-bold text-white">修改管理员密码</h3>
              <p className="text-3xs text-slate-400">Change Admin Password</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-bold block">原密码 (Current Password)</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码..."
              autoFocus
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-700 text-slate-100 focus:border-cyan-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-bold block">新密码 (New Password)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少3位）..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-700 text-slate-100 focus:border-cyan-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-bold block">确认新密码 (Confirm New Password)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-700 text-slate-100 focus:border-cyan-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-black text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? '正在保存...' : '确认修改'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-700 cursor-pointer transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
