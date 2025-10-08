// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Badge, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Label, Textarea, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui';
// @ts-ignore;
import { Search, Plus, Calendar, Phone, User, MapPin, Pill, X, Trash2 } from 'lucide-react';

export default function HomePage(props) {
  const {
    $w,
    style
  } = props;
  const {
    toast
  } = useToast();
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    phone: '',
    address: '',
    diseases: '',
    medications: ''
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 从数据模型查询用户数据
  useEffect(() => {
    fetchUsers();
  }, []);
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetRecordsV2',
        params: {
          select: {
            $master: true
          },
          getCount: true
        }
      });
      if (result.records) {
        // 筛选出需要随访的用户（7天内或已过期）
        const today = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(today.getDate() + 7);
        const followupUsers = result.records.filter(user => {
          if (!user.followups || user.followups.length === 0) return false;

          // 获取最新的随访记录
          const latestFollowup = user.followups[user.followups.length - 1];
          if (!latestFollowup.nextFollowupDate) return false;
          const nextFollowupDate = new Date(latestFollowup.nextFollowupDate);
          return nextFollowupDate <= sevenDaysLater;
        });
        setUsers(followupUsers);
        setFilteredUsers(followupUsers);
      }
    } catch (error) {
      console.error('查询用户数据失败:', error);
      toast({
        title: '数据加载失败',
        description: '无法获取用户数据，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setLoading(false);
    }
  };

  // 过滤用户列表
  useEffect(() => {
    const filtered = users.filter(user => user.name?.includes(searchText) || user.phone?.includes(searchText) || user.address?.includes(searchText));
    setFilteredUsers(filtered);
  }, [searchText, users]);

  // 搜索按钮点击事件 - 支持姓名、手机号、小区名称搜索
  const handleSearchClick = async () => {
    if (!searchText.trim()) {
      toast({
        title: '请输入搜索内容',
        description: '请填写姓名、手机号或小区名称进行搜索',
        variant: 'destructive',
        duration: 1000
      });
      return;
    }
    try {
      setSearchLoading(true);
      const result = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              $or: [{
                name: {
                  $search: searchText
                }
              }, {
                phone: {
                  $search: searchText
                }
              }, {
                address: {
                  $search: searchText
                }
              }]
            }
          },
          select: {
            $master: true
          }
        }
      });
      setSearchResults(result.records || []);
      setShowSearchModal(true);
    } catch (error) {
      console.error('搜索失败:', error);
      toast({
        title: '搜索失败',
        description: '搜索过程中出现错误，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // 添加新用户
  const handleAddUser = () => {
    setShowAddUserModal(true);
    setNewUserForm({
      name: '',
      phone: '',
      address: '',
      diseases: '',
      medications: ''
    });
  };
  const handleSaveNewUser = async () => {
    if (!newUserForm.name || !newUserForm.phone || !newUserForm.address) {
      toast({
        title: '信息不完整',
        description: '请填写姓名、手机号和地址',
        variant: 'destructive',
        duration: 1000
      });
      return;
    }
    try {
      setAddUserLoading(true);
      // 处理数组字段
      const diseasesArray = newUserForm.diseases ? newUserForm.diseases.split('、').map(d => d.trim()).filter(d => d) : [];
      const medicationsArray = newUserForm.medications ? newUserForm.medications.split('\n').map(m => m.trim()).filter(m => m) : [];
      // 创建新用户
      const result = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaCreateV2',
        params: {
          data: {
            name: newUserForm.name,
            phone: newUserForm.phone,
            address: newUserForm.address,
            diseases: diseasesArray,
            medications: medicationsArray,
            followups: []
          }
        }
      });
      toast({
        title: '添加成功',
        description: '用户信息已保存',
        variant: 'default',
        duration: 1000
      });
      setShowAddUserModal(false);
      // 刷新用户列表
      fetchUsers();
    } catch (error) {
      console.error('添加用户失败:', error);
      toast({
        title: '添加失败',
        description: '无法保存用户信息，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setAddUserLoading(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaDeleteV2',
        params: {
          filter: {
            where: {
              $and: [{
                _id: {
                  $eq: userToDelete._id
                }
              }]
            }
          }
        }
      });
      toast({
        title: '删除成功',
        description: '用户信息已删除',
        variant: 'default',
        duration: 1000
      });

      // 更新搜索结果列表
      setSearchResults(prev => prev.filter(user => user._id !== userToDelete._id));
      // 刷新用户列表
      fetchUsers();
    } catch (error) {
      console.error('删除用户失败:', error);
      toast({
        title: '删除失败',
        description: '无法删除用户信息，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };
  const handleUserClick = user => {
    setShowSearchModal(false);
    setSearchText('');
    $w.utils.navigateTo({
      pageId: 'userDetail',
      params: {
        id: user._id
      }
    });
  };
  const handleDeleteClick = (user, e) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发用户点击
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };
  const formatDate = dateStr => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  const getDaysDiff = dateStr => {
    const today = new Date();
    const followupDate = new Date(dateStr);
    const diffTime = followupDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const getStatusInfo = user => {
    if (!user.followups || user.followups.length === 0) {
      return {
        text: '无随访记录',
        variant: 'secondary',
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    }
    const latestFollowup = user.followups[user.followups.length - 1];
    if (!latestFollowup.nextFollowupDate) {
      return {
        text: '无下次随访',
        variant: 'secondary',
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    }
    const daysDiff = getDaysDiff(latestFollowup.nextFollowupDate);
    if (daysDiff < 0) {
      return {
        text: `已过期 ${Math.abs(daysDiff)}天`,
        variant: 'destructive',
        color: 'bg-red-100 text-red-800 border-red-200'
      };
    } else if (daysDiff <= 7) {
      return {
        text: `${daysDiff}天后`,
        variant: 'default',
        color: 'bg-green-100 text-green-800 border-green-200'
      };
    } else {
      return {
        text: `${daysDiff}天后`,
        variant: 'secondary',
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    }
  };
  return <div style={style} className="min-h-screen bg-gray-50">
      {/* 顶部搜索栏 - 修改为支持姓名、手机号、小区名称搜索 */}
      <div className="bg-white shadow-sm border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="text" placeholder="搜索姓名、手机号或小区名称..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-10 h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm" onKeyPress={e => {
            if (e.key === 'Enter') {
              handleSearchClick();
            }
          }} />
          </div>
          <Button onClick={handleSearchClick} className="h-11 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 添加用户按钮 */}
      <div className="px-4 py-3">
        <Button onClick={handleAddUser} className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow-sm transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          添加新用户
        </Button>
      </div>

      {/* 待随访用户列表 */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-800">待随访用户</h2>
          <span className="text-xs text-gray-500">
            {filteredUsers.length} 位
          </span>
        </div>

        {loading ? <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">加载中...</p>
          </div> : filteredUsers.length === 0 ? <div className="text-center py-8 text-gray-500">
            <User className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">暂无待随访用户</p>
          </div> : filteredUsers.map(user => {
        const statusInfo = getStatusInfo(user);
        const latestFollowup = user.followups && user.followups.length > 0 ? user.followups[user.followups.length - 1] : null;
        return <Card key={user._id} className="cursor-pointer hover:shadow-sm transition-shadow border-gray-100" onClick={() => handleUserClick(user)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-sm font-medium text-gray-800">
                      {user.name || '未命名用户'}
                    </CardTitle>
                    <Badge variant={statusInfo.variant} className={`${statusInfo.color} text-xs px-2 py-0.5`}>
                      {statusInfo.text}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center">
                      <Phone className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                      <span>{user.phone || '未设置手机号'}</span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-green-500 mt-0.5" />
                      <span className="flex-1">{user.address || '未设置地址'}</span>
                    </div>
                    {latestFollowup && latestFollowup.nextFollowupDate && <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                      <span>下次随访: {formatDate(latestFollowup.nextFollowupDate)}</span>
                    </div>}
                  </div>
                </CardContent>
              </Card>;
      })}
      </div>

      {/* 搜索弹窗 */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="w-[95%] max-w-[360px] mx-auto my-4 max-h-[70vh] overflow-hidden">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-base">搜索结果</DialogTitle>
            <DialogDescription className="text-xs">
              找到 {searchResults.length} 个匹配的用户
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[50vh]">
            {searchLoading ? <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">搜索中...</p>
              </div> : searchResults.length === 0 ? <div className="text-center py-8 text-gray-500">
                <User className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">未找到匹配的用户</p>
              </div> : <div className="space-y-2">
                {searchResults.map(user => <div key={user._id} className="p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors relative group" onClick={() => handleUserClick(user)}>
                    {/* 删除按钮 */}
                    <Button variant="ghost" size="sm" onClick={e => handleDeleteClick(user, e)} className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    
                    <div className="flex items-center justify-between mb-2 pr-6">
                      <h3 className="text-sm font-medium text-gray-800">
                        {user.name || '未命名用户'}
                      </h3>
                    </div>
                    
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex items-center">
                        <Phone className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                        <span>{user.phone || '未设置手机号'}</span>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-green-500 mt-0.5" />
                        <span className="flex-1">{user.address || '未设置地址'}</span>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* 添加用户弹窗 */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="w-[95%] max-w-[360px] mx-auto my-4 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-base flex items-center">
              <Plus className="h-4 w-4 mr-2 text-blue-500" />
              添加新用户
            </DialogTitle>
            <DialogDescription className="text-xs">
              填写用户基本信息和健康档案
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* 基本信息 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-800 flex items-center">
                <User className="h-4 w-4 mr-2 text-blue-500" />
                基本信息
              </h3>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newUserName" className="text-sm">姓名</Label>
                  <Input id="newUserName" value={newUserForm.name} onChange={e => setNewUserForm(prev => ({
                  ...prev,
                  name: e.target.value
                }))} className="h-10 text-sm" placeholder="请输入用户姓名" disabled={addUserLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newUserPhone" className="text-sm">手机号</Label>
                  <Input id="newUserPhone" type="tel" value={newUserForm.phone} onChange={e => setNewUserForm(prev => ({
                  ...prev,
                  phone: e.target.value
                }))} className="h-10 text-sm" placeholder="请输入手机号" disabled={addUserLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newUserAddress" className="text-sm">地址</Label>
                  <Input id="newUserAddress" value={newUserForm.address} onChange={e => setNewUserForm(prev => ({
                  ...prev,
                  address: e.target.value
                }))} className="h-10 text-sm" placeholder="请输入详细地址（包含小区名称）" disabled={addUserLoading} />
                </div>
              </div>
            </div>

            {/* 健康档案 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-800 flex items-center">
                <Pill className="h-4 w-4 mr-2 text-green-500" />
                健康档案
              </h3>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newUserDiseases" className="text-sm">基础疾病</Label>
                  <Input id="newUserDiseases" value={newUserForm.diseases} onChange={e => setNewUserForm(prev => ({
                  ...prev,
                  diseases: e.target.value
                }))} className="h-10 text-sm" placeholder="多个疾病用、分隔（可选）" disabled={addUserLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newUserMedications" className="text-sm">用药情况</Label>
                  <Textarea id="newUserMedications" value={newUserForm.medications} onChange={e => setNewUserForm(prev => ({
                  ...prev,
                  medications: e.target.value
                }))} rows={3} className="text-sm resize-none" placeholder="每行一种用药，格式：药名-用法（可选）" disabled={addUserLoading} />
                </div>
              </div>
            </div>
          </div>

          {/* 底部按钮区域 - 确保始终可见 */}
          <div className="border-t border-gray-200 pt-4 mt-auto">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddUserModal(false)} disabled={addUserLoading} className="h-10 px-6 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50">
                取消
              </Button>
              <Button onClick={handleSaveNewUser} disabled={addUserLoading} className="h-10 px-6 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white">
                {addUserLoading ? <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </div> : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[95%] max-w-[360px] mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              确定要删除用户 "{userToDelete?.name || '未命名用户'}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                  删除中...
                </div> : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}