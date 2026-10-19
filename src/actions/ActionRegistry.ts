/**
 * LushCare Electron - Action Registry
 * Quản lý, đăng ký và cung cấp các hành động tương tác Facebook.
 */

import { BaseAction, ActionMetadata } from './BaseAction';
import { SurfingNewsfeedAction } from './facebook/SurfingNewsfeedAction';
import { WatchReelsAction } from './facebook/WatchReelsAction';
import { AddFriendAction } from './facebook/AddFriendAction';
import { PostWallAction } from './facebook/PostWallAction';
import { InteractPostAction } from './facebook/InteractPostAction';
import { SendMessageAction } from './facebook/SendMessageAction';
import { PostGroupAction } from './facebook/PostGroupAction';
import { JoinGroupAction } from './facebook/JoinGroupAction';
import { InteractGroupAction } from './facebook/InteractGroupAction';
import { LikeFanpageAction } from './facebook/LikeFanpageAction';
import { ReviewFanpageAction } from './facebook/ReviewFanpageAction';
import { WatchStoryAction } from './facebook/WatchStoryAction';
import { WatchVideoAction } from './facebook/WatchVideoAction';
import { ConfirmFriendAction } from './facebook/ConfirmFriendAction';
import { BirthdayWishAction } from './facebook/BirthdayWishAction';
import { BreakRestAction } from './facebook/BreakRestAction';
import { ChangePasswordAction } from './facebook/ChangePasswordAction';
import { Enable2FAAction } from './facebook/Enable2FAAction';
import { Unlock956HotmailAction } from './facebook/Unlock956HotmailAction';

export class ActionRegistry {
  private actions = new Map<string, BaseAction>();
  private aliases = new Map<string, string>();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Đăng ký một hành động mới vào hệ thống
   * @param action Instance kế thừa BaseAction
   * @param aliases Mảng các tên định danh phụ (ví dụ: 'fHDDangBai', 'PostWall')
   */
  register(action: BaseAction, aliases: string[] = []): void {
    const primaryCode = action.actionCode;
    this.actions.set(primaryCode, action);

    for (const alias of aliases) {
      this.aliases.set(alias.toLowerCase(), primaryCode);
    }
  }

  /**
   * Tìm và lấy hành động theo mã định danh (hỗ trợ cả alias không phân biệt hoa thường)
   */
  get(actionCode: string): BaseAction | undefined {
    if (!actionCode) return undefined;

    // Tìm chính xác theo mã chính
    if (this.actions.has(actionCode)) {
      return this.actions.get(actionCode);
    }

    // Tìm theo alias không phân biệt hoa thường
    const normalized = actionCode.toLowerCase();
    if (this.aliases.has(normalized)) {
      const primary = this.aliases.get(normalized)!;
      return this.actions.get(primary);
    }

    // Thử so sánh không phân biệt hoa thường trực tiếp trên mã chính
    for (const [code, action] of this.actions.entries()) {
      if (code.toLowerCase() === normalized) {
        return action;
      }
    }

    return undefined;
  }

  /**
   * Kiểm tra hành động có tồn tại trong hệ thống không
   */
  has(actionCode: string): boolean {
    return this.get(actionCode) !== undefined;
  }

  /**
   * Lấy danh sách toàn bộ các hành động đã đăng ký
   */
  getAll(): BaseAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Lấy danh sách metadata của toàn bộ các hành động
   */
  getAllMetadata(): ActionMetadata[] {
    return this.getAll().map((action) => action.getMetadata());
  }

  /**
   * Trả về định dạng chuẩn cho kênh IPC `actions:getAllTypes`
   */
  getAllTypes(): Array<{
    id: number;
    code: string;
    name: string;
    category: string;
    defaultJson: string;
  }> {
    return this.getAll().map((action, index) => ({
      id: index + 1,
      code: action.actionCode,
      name: action.name,
      category: action.category,
      defaultJson: JSON.stringify(action.defaultConfig, null, 2),
    }));
  }

  /**
   * Đăng ký toàn bộ các hành động tương tác Facebook vào hệ thống
   */
  private registerDefaults(): void {
    // 1. Lướt Bảng Tin
    const surfingNewsfeed = new SurfingNewsfeedAction();
    this.register(surfingNewsfeed, ['SurfingNewsfeed', 'fHDBaiVietNewsfeed', 'HDBaiVietNewsfeed2', 'HDBaiVietNewsfeed3']);

    // 2. Xem Reels
    const watchReels = new WatchReelsAction();
    this.register(watchReels, ['WatchReels', 'HDXemReels', 'fHDLuotReels', 'fHDTuongTacReelNgauNhien', 'HDTuongTacReelChiDinh']);

    // 3. Kết Bạn
    const addFriend = new AddFriendAction();
    this.register(addFriend, ['AddFriend', 'HDKetBanTepUid', 'fHDKetBanGoiY', 'fHDKetBanTepUid']);

    // 4. Đăng Bài Tường
    const postWall = new PostWallAction();
    this.register(postWall, ['PostWall', 'HDDangStatus', 'fHDDangBai', 'fHDDangStatus', 'fHDDangBaiTuong', 'HDDangStatusV2']);

    // 5. Tương Tác Bài Viết
    const interactPost = new InteractPostAction();
    this.register(interactPost, ['InteractPost', 'fHDBuffLikeComment', 'fHDMoLinkBaiViet', 'fHDCommentNoiDung', 'fHDThaCamXucBaiViet', 'HDBaiVietBanBe', 'HDBaiVietNhom', 'HDTuongTacNhomv2']);

    // 6. Gửi Tin Nhắn Messenger
    const sendMessage = new SendMessageAction();
    this.register(sendMessage, ['SendMessage', 'fHDNhanTinUid', 'fHDNhanTinBanBe', 'HDKhanNhanTin', 'HDNhanTinUid']);

    // 7. Đăng Bài Vào Nhóm
    const postGroup = new PostGroupAction();
    this.register(postGroup, ['PostGroup', 'fHDDangBaiNhom', 'HDDangBaiNhom']);

    // 8. Tham Gia Nhóm
    const joinGroup = new JoinGroupAction();
    this.register(joinGroup, ['JoinGroup', 'fHDThamGiaNhomTuKhoa', 'fHDThamGiaNhomGoiY', 'fHDThamGiaNhomTepUid', 'HDThamGiaNhomTuKhoa']);

    // 9. Tương Tác Trong Nhóm
    const interactGroup = new InteractGroupAction();
    this.register(interactGroup, ['InteractGroup', 'fHDTuongTacNhom', 'HDTuongTacNhom']);

    // 10. Thích & Theo Dõi Fanpage
    const likeFanpage = new LikeFanpageAction();
    this.register(likeFanpage, ['LikeFanpage', 'fHDLikeFanpage', 'HDLikeFanpage']);

    // 11. Đánh Giá Fanpage
    const reviewFanpage = new ReviewFanpageAction();
    this.register(reviewFanpage, ['ReviewFanpage', 'fHDDanhGiaFanpage', 'HDDanhGiaFanpage']);

    // 12. Xem Story Bạn Bè
    const watchStory = new WatchStoryAction();
    this.register(watchStory, ['WatchStory', 'fHDXemStory', 'HDXemStory']);

    // 13. Xem Video Facebook Watch
    const watchVideo = new WatchVideoAction();
    this.register(watchVideo, ['WatchVideo', 'fHDXemWatch', 'HDXemWatch']);

    // 14. Chấp Nhận Lời Mời Kết Bạn
    const confirmFriend = new ConfirmFriendAction();
    this.register(confirmFriend, ['ConfirmFriend', 'fHDXacNhanKetBan', 'HDXacNhanKetBan']);

    // 15. Chúc Mừng Sinh Nhật
    const birthdayWish = new BirthdayWishAction();
    this.register(birthdayWish, ['BirthdayWish', 'fHDChucMungSinhNhat', 'HDChucMungSinhNhat']);

    // 16. Nghỉ Giải Lao Giữa Giờ
    const breakRest = new BreakRestAction();
    this.register(breakRest, ['BreakRest', 'fHDNghiGiaiLao', 'HDNghiGiaiLao']);

    // 17. Đổi Mật Khẩu Tự Động
    const changePassword = new ChangePasswordAction();
    this.register(changePassword, ['ChangePassword', 'fHDDoiMatKhau', 'HDDoiMatKhau']);

    // 18. Bật Bảo Mật 2 Lớp (2FA Key)
    const enable2FA = new Enable2FAAction();
    this.register(enable2FA, ['Enable2FA', 'fHDBat2FA', 'HDBat2FA']);

    // 19. Vượt Két Sắt 956 Qua Hotmail
    const unlock956 = new Unlock956HotmailAction();
    this.register(unlock956, ['Unlock956', 'fHDGiai956Hotmail', 'HDGiai956Hotmail']);
  }
}

// Khởi tạo Singleton Instance cho toàn ứng dụng
export const actionRegistry = new ActionRegistry();
