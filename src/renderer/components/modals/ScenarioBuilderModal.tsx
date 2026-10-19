import React, { useState, useMemo } from 'react';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Settings,
  Search,
  Globe,
  Smartphone,
  Coffee,
  UserPlus,
  Users,
  MessageCircle,
  ThumbsUp,
  ShieldCheck,
  KeyRound,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ScenarioEntity, ActionEntity } from '@shared/types';

interface ScenarioBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: ScenarioEntity[];
  onSaveScenario: (scenario: ScenarioEntity) => Promise<void>;
  onCreateScenario: (name: string) => Promise<ScenarioEntity>;
  onDeleteScenario: (id: number) => Promise<void>;
  onApplyToAccounts: (scenarioId: number) => void;
}

// 70 Automation Action Catalog Types
interface ActionTypeDefinition {
  code: string;
  name: string;
  category: string;
  description: string;
  defaultConfig: Record<string, any>;
  icon: any;
}

const ACTION_CATALOG: ActionTypeDefinition[] = [
  // Bảng tin
  { code: 'fHDBaiVietNewsfeed', name: 'Lướt Bảng Tin Newsfeed', category: 'feed', description: 'Tự động cuộn trang, thả cảm xúc Like/Love ngẫu nhiên', defaultConfig: { timeMin: 120, timeMax: 240, likePercent: 40, commentPercent: 20 }, icon: Globe },
  { code: 'fHDXemStory', name: 'Xem Tin Story Bạn Bè', category: 'feed', description: 'Lướt xem story của danh sách bạn bè và thả tim', defaultConfig: { storyCount: 4, heartPercent: 50 }, icon: Smartphone },
  { code: 'fHDXemWatch', name: 'Xem Video Facebook Watch', category: 'feed', description: 'Xem video theo thời lượng ngẫu nhiên tăng độ trust', defaultConfig: { videoCount: 3, timePerVideoSec: 60 }, icon: Globe },
  { code: 'fHDLuotReels', name: 'Lướt Xem Video Reels', category: 'feed', description: 'Lướt video ngắn Reels và thả tim tương tác', defaultConfig: { reelsCount: 5, likePercent: 30 }, icon: Smartphone },
  
  // Đăng bài & Seeding
  { code: 'fHDDangBaiTuong', name: 'Đăng Bài Lên Tường Cá Nhân', category: 'post', description: 'Đăng status văn bản kèm ảnh có Spin Text', defaultConfig: { content: '{Chào ngày mới cả nhà|Chúc mọi người tuần mới vui vẻ!}', hasImage: false }, icon: FileText },
  { code: 'fHDDangBaiNhom', name: 'Đăng Bài Vào Nhóm', category: 'post', description: 'Tự động đăng bài vào các group đã tham gia', defaultConfig: { groupCount: 3, content: '{Sản phẩm|Dịch vụ} uy tín chất lượng' }, icon: Users },
  { code: 'fHDMoLinkBaiViet', name: 'Mở Link Bài Viết Chỉ Định', category: 'seeding', description: 'Truy cập thẳng vào link bài viết Facebook', defaultConfig: { url: 'https://facebook.com/posts/example' }, icon: Globe },
  { code: 'fHDCommentNoiDung', name: 'Bình Luận Spin Text', category: 'seeding', description: 'Comment vào bài viết kèm giải mã Spin Text tự động', defaultConfig: { spinText: '{Shop|Bác} cho em xin thông tin với ạ!|Check ib em nhé' }, icon: MessageCircle },
  { code: 'fHDThaCamXucBaiViet', name: 'Thả Cảm Xúc Bài Viết', category: 'seeding', description: 'Thả Like, Love, Care, Haha, Wow vào bài viết', defaultConfig: { reaction: 'LOVE' }, icon: ThumbsUp },

  // Bạn bè & Nhóm
  { code: 'fHDNhanTinUid', name: 'Gửi Tin Nhắn Messenger', category: 'friends', description: 'Gửi tin nhắn Messenger theo UID hoặc bạn bè kèm Spin Text', defaultConfig: { messageText: '{Chào bạn|Hello bạn}! Chúc bạn ngày mới vui vẻ nha!', count: 3 }, icon: MessageCircle },
  { code: 'fHDKetBanGoiY', name: 'Gửi Lời Mời Kết Bạn Gợi Ý', category: 'friends', description: 'Gửi lời mời kết bạn từ danh sách đề xuất của FB', defaultConfig: { count: 3, onlyMutual: true }, icon: UserPlus },
  { code: 'fHDXacNhanKetBan', name: 'Chấp Nhận Lời Mời Kết Bạn', category: 'friends', description: 'Đồng ý kết bạn từ những người gửi lời mời', defaultConfig: { count: 5 }, icon: UserPlus },
  { code: 'fHDChucMungSinhNhat', name: 'Chúc Mừng Sinh Nhật Bạn Bè', category: 'friends', description: 'Gửi lời chúc sinh nhật lên tường hoặc tin nhắn', defaultConfig: { message: 'Chúc mừng sinh nhật bạn nhé! 🎂' }, icon: MessageCircle },
  { code: 'fHDThamGiaNhomTuKhoa', name: 'Tham Gia Nhóm Theo Từ Khóa', category: 'groups', description: 'Tìm kiếm nhóm theo từ khóa và gửi yêu cầu vào nhóm', defaultConfig: { keyword: 'Chợ sinh viên Hà Nội', groupCount: 2 }, icon: Users },
  { code: 'fHDTuongTacNhom', name: 'Tương Tác Bài Viết Trong Nhóm', category: 'groups', description: 'Lướt bài và like trong các nhóm đã tham gia', defaultConfig: { groupCount: 2, timeSec: 60 }, icon: Users },

  // Fanpage
  { code: 'fHDLikeFanpage', name: 'Thích & Theo Dõi Fanpage', category: 'fanpage', description: 'Theo dõi các fanpage chỉ định hoặc theo từ khóa', defaultConfig: { pageUrl: 'https://facebook.com/fanpage' }, icon: ThumbsUp },
  { code: 'fHDDanhGiaFanpage', name: 'Đánh Giá 5 Sao Fanpage', category: 'fanpage', description: 'Để lại đánh giá kèm bình luận uy tín', defaultConfig: { rating: 5, reviewText: 'Dịch vụ rất tốt và chuyên nghiệp!' }, icon: Sparkles },

  // Nghỉ ngơi & Bảo mật
  { code: 'fHDNghiGiaiLao', name: 'Nghỉ Giải Lao Giữa Giờ', category: 'utility', description: 'Tạm dừng luồng ngẫu nhiên tránh checkpoint', defaultConfig: { delayMin: 15, delayMax: 30 }, icon: Coffee },
  { code: 'fHDDoiMatKhau', name: 'Đổi Mật Khẩu Tự Động', category: 'security', description: 'Đổi mật khẩu theo cấu trúc ngẫu nhiên và lưu SQLite', defaultConfig: { pattern: 'Vmax@{rand8}!' }, icon: KeyRound },
  { code: 'fHDBat2FA', name: 'Bật Bảo Mật 2 Lớp (2FA Key)', category: 'security', description: 'Bật xác thực 2 yếu tố và lưu mã Secret Key', defaultConfig: { saveToDb: true }, icon: ShieldCheck },
  { code: 'fHDGiai956Hotmail', name: 'Vượt Két Sắt 956 Qua Hotmail', category: 'security', description: 'Đọc mã xác minh OTP qua cổng IMAP', defaultConfig: { timeoutSec: 90 }, icon: ShieldCheck },
  { code: 'fHDGiai282SimOtp', name: 'Thuê SIM Giải Checkpoint 282', category: 'security', description: 'Gọi API thuê SIM tự động nhập mã xác minh', defaultConfig: { provider: 'fastsim', serviceCode: 'facebook' }, icon: Smartphone },
];

export const ScenarioBuilderModal: React.FC<ScenarioBuilderModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  onSaveScenario,
  onCreateScenario,
  onDeleteScenario,
  onApplyToAccounts,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number>(() => scenarios[0]?.id || 1);
  const [scenarioList, setScenarioList] = useState<ScenarioEntity[]>(scenarios);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState<string>('all');
  const [drawerSearch, setDrawerSearch] = useState('');
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [spinPreview, setSpinPreview] = useState('');

  if (!isOpen) return null;

  const currentScenario = scenarioList.find(s => s.id === selectedScenarioId) || scenarioList[0];

  const handleCreateNew = async () => {
    const name = prompt('Nhập tên kịch bản mới:');
    if (!name || !name.trim()) return;
    const created = await onCreateScenario(name.trim());
    setScenarioList(prev => [...prev, created]);
    setSelectedScenarioId(created.id);
  };

  const handleDuplicate = () => {
    if (!currentScenario) return;
    const dup: ScenarioEntity = {
      ...currentScenario,
      id: Date.now(),
      name: `${currentScenario.name} (Bản sao)`,
      actions: currentScenario.actions.map(a => ({ ...a, id: Date.now() + Math.floor(Math.random() * 1000) })),
    };
    setScenarioList(prev => [...prev, dup]);
    setSelectedScenarioId(dup.id);
  };

  const handleDeleteCurrent = async () => {
    if (!currentScenario) return;
    if (confirm(`Xác nhận xóa kịch bản "${currentScenario.name}"?`)) {
      await onDeleteScenario(currentScenario.id);
      const remaining = scenarioList.filter(s => s.id !== currentScenario.id);
      setScenarioList(remaining);
      if (remaining.length > 0) setSelectedScenarioId(remaining[0].id);
    }
  };

  const handleMoveAction = (index: number, direction: 'UP' | 'DOWN') => {
    if (!currentScenario) return;
    const actions = [...currentScenario.actions];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= actions.length) return;

    const temp = actions[index];
    actions[index] = actions[targetIndex];
    actions[targetIndex] = temp;

    // reindex
    actions.forEach((a, idx) => {
      a.orderIndex = idx + 1;
    });

    const updated = { ...currentScenario, actions };
    setScenarioList(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteAction = (actionId: number) => {
    if (!currentScenario) return;
    const actions = currentScenario.actions.filter(a => a.id !== actionId);
    actions.forEach((a, idx) => {
      a.orderIndex = idx + 1;
    });
    const updated = { ...currentScenario, actions };
    setScenarioList(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  };

  const handleAddActionFromCatalog = (catalogItem: ActionTypeDefinition) => {
    if (!currentScenario) return;
    const newAction: ActionEntity = {
      id: Date.now(),
      scenarioId: currentScenario.id,
      actionCode: catalogItem.code,
      name: catalogItem.name,
      configJson: JSON.stringify(catalogItem.defaultConfig),
      orderIndex: currentScenario.actions.length + 1,
    };
    const updated = {
      ...currentScenario,
      actions: [...currentScenario.actions, newAction],
    };
    setScenarioList(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setShowDrawer(false);
  };

  const handleSave = async () => {
    if (currentScenario) {
      await onSaveScenario(currentScenario);
      alert('Đã lưu thành công cấu hình kịch bản!');
    }
  };

  // Filter catalog
  const filteredCatalog = ACTION_CATALOG.filter(item => {
    if (drawerCategory !== 'all' && item.category !== drawerCategory) return false;
    if (drawerSearch.trim() !== '') {
      const q = drawerSearch.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-[1100px] h-[680px] bg-[#061813] border border-[#1b4d40]/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-zinc-200 relative">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#1b4d40]/60 flex items-center justify-between bg-[#09221b]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#1f8538]/20 border border-[#61c73f]/40 flex items-center justify-center text-[#61c73f]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">
                THIẾT LẬP KỊCH BẢN TƯƠNG TÁC TỰ ĐỘNG (SCENARIO BUILDER)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Xây dựng chuỗi kịch bản nuôi nick thông minh từ kho 70 hành động
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#0e2c23] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Scenario List */}
          <div className="w-72 bg-[#041611] border-r border-[#1b4d40]/50 flex flex-col">
            <div className="p-3 border-b border-[#1b4d40]/40 flex items-center justify-between">
              <span className="font-semibold text-zinc-300">DANH SÁCH KỊCH BẢN</span>
              <button
                onClick={handleCreateNew}
                className="px-2 py-1 bg-[#0b261f] hover:bg-[#12392f] border border-[#61c73f]/40 text-[#61c73f] hover:text-white rounded text-[11px] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm Mới</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {scenarioList.map(sc => {
                const isSelected = sc.id === currentScenario?.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#0e2c23] border-l-2 border-[#61c73f] border-t-[#61c73f]/40 border-r-[#61c73f]/40 border-b-[#61c73f]/40 text-white shadow-sm'
                        : 'bg-[#071f19]/70 border-[#1b4d40]/40 hover:bg-[#0b261f] text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-zinc-100 truncate">{sc.name}</span>
                      <span className="font-mono text-[10px] bg-[#041611] text-[#61c73f] border border-[#1b4d40]/60 px-1.5 py-0.5 rounded">
                        {sc.actions.length} bước
                      </span>
                    </div>
                    {sc.description && (
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                        {sc.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Scenario Action Pipeline */}
          <div className="flex-1 flex flex-col bg-[#031410] overflow-hidden">
            {/* Pipeline Header */}
            <div className="h-12 px-4 border-b border-[#1b4d40]/40 flex items-center justify-between bg-[#061813]">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Kịch bản:</span>
                <span className="font-bold text-sm text-[#61c73f]">{currentScenario?.name}</span>
              </div>
              <button
                onClick={handleSave}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#1f8538] to-[#259b43] hover:from-[#17682c] hover:to-[#1f8538] text-white rounded font-medium flex items-center gap-1.5 text-xs shadow-sm shadow-[#1f8538]/30 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>

            {/* Pipeline Steps List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {currentScenario?.actions.length === 0 ? (
                <div className="h-48 border border-dashed border-[#1b4d40] rounded-xl flex flex-col items-center justify-center p-6 text-zinc-500">
                  <Sliders className="w-8 h-8 mb-2 text-zinc-600" />
                  <p>Kịch bản này chưa có bước hành động nào.</p>
                  <p className="text-[11px]">Bấm nút bên dưới để chọn hành động từ kho 70 kịch bản mẫu.</p>
                </div>
              ) : (
                currentScenario?.actions.map((action, idx) => (
                  <div
                    key={action.id}
                    className="p-3 bg-[#061813] border border-[#1b4d40]/50 rounded-lg flex items-center justify-between hover:border-[#61c73f]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-[#041611] border border-[#1b4d40] flex items-center justify-center font-mono font-bold text-[#61c73f] text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 flex items-center gap-2">
                          <span>{action.name}</span>
                          <span className="font-mono text-[10px] text-zinc-400 bg-[#041611] border border-[#1b4d40]/60 px-1.5 py-0.2 rounded">
                            {action.actionCode}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-zinc-400 mt-0.5 truncate max-w-lg">
                          Tham số: {action.configJson}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveAction(idx, 'UP')}
                        disabled={idx === 0}
                        title="Di chuyển lên"
                        className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-white rounded disabled:opacity-20"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveAction(idx, 'DOWN')}
                        disabled={idx === (currentScenario?.actions.length ?? 0) - 1}
                        title="Di chuyển xuống"
                        className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-white rounded disabled:opacity-20"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        title="Xóa bước này"
                        className="p-1 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Add Action Button */}
              <button
                onClick={() => setShowDrawer(true)}
                className="w-full py-3 border-2 border-dashed border-[#61c73f]/40 hover:border-[#61c73f]/80 bg-[#061813]/40 hover:bg-[#0e2c23]/60 text-[#61c73f] hover:text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>THÊM HÀNH ĐỘNG MỚI (CHỌN TỪ KHO 70 HÀNH ĐỘNG)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer: 70 Action Catalog Slider */}
        {showDrawer && (
          <div className="absolute top-12 right-0 bottom-0 w-[440px] bg-[#061813] border-l border-[#1b4d40] shadow-2xl flex flex-col z-30 animate-slide-left">
            <div className="p-3 border-b border-[#1b4d40]/60 flex items-center justify-between bg-[#09221b]">
              <span className="font-semibold text-white">KHO 70 HÀNH ĐỘNG TƯƠNG TÁC</span>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Search & Tabs */}
            <div className="p-3 border-b border-[#1b4d40]/50 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm hành động (Reels, Story, Đổi pass...)"
                  value={drawerSearch}
                  onChange={e => setDrawerSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 bg-[#041611] border border-[#1b4d40]/80 rounded text-xs text-zinc-100 focus:outline-none focus:border-[#61c73f]"
                />
              </div>

              <div className="flex flex-wrap gap-1 text-[11px]">
                {[
                  { id: 'all', label: 'Tất Cả' },
                  { id: 'feed', label: 'Bảng Tin' },
                  { id: 'post', label: 'Đăng Bài' },
                  { id: 'seeding', label: 'Tương Tác' },
                  { id: 'friends', label: 'Bạn Bè' },
                  { id: 'groups', label: 'Hội Nhóm' },
                  { id: 'fanpage', label: 'Fanpage' },
                  { id: 'security', label: 'Bảo Mật' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setDrawerCategory(cat.id)}
                    className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                      drawerCategory === cat.id
                        ? 'bg-[#1f8538] text-white font-medium border border-[#61c73f]/50'
                        : 'bg-[#041611] text-zinc-400 hover:bg-[#0e2c23] border border-[#1b4d40]/40'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredCatalog.map(item => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.code}
                    onClick={() => handleAddActionFromCatalog(item)}
                    className="p-2.5 bg-[#041611] hover:bg-[#0e2c23] border border-[#1b4d40]/50 hover:border-[#61c73f]/50 rounded-lg cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-[#61c73f]" />
                        <span className="font-semibold text-zinc-200 group-hover:text-[#61c73f]">
                          {item.name}
                        </span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="h-14 px-4 border-t border-[#1b4d40]/50 bg-[#061813] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDuplicate}
              className="px-3 py-1.5 bg-[#0b261f] hover:bg-[#12392f] border border-[#1b4d40]/60 text-zinc-300 rounded font-medium flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao Chép Kịch Bản</span>
            </button>
            <button
              onClick={handleDeleteCurrent}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Kịch Bản Này</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0b261f] hover:bg-[#12392f] border border-[#1b4d40]/60 text-zinc-300 rounded-md font-medium"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                if (currentScenario) {
                  onApplyToAccounts(currentScenario.id);
                  onClose();
                }
              }}
              className="px-5 py-2 bg-gradient-to-r from-[#1f8538] to-[#259b43] hover:from-[#17682c] hover:to-[#1f8538] text-white rounded-md font-semibold flex items-center gap-2 shadow-lg shadow-[#1f8538]/30"
            >
              <Check className="w-4 h-4" />
              <span>ÁP DỤNG CHO DÀN NICK ĐANG CHỌN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
