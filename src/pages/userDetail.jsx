// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Label, Textarea } from '@/components/ui';
// @ts-ignore;
import { ArrowLeft, MapPin, Pill, Calendar, Plus, User, Phone, Home, Edit3, Loader } from 'lucide-react';

export default function UserDetailPage(props) {
  const {
    $w,
    style
  } = props;
  const {
    toast
  } = useToast();
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [showBasicEditDialog, setShowBasicEditDialog] = useState(false);
  const [showHealthEditDialog, setShowHealthEditDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [newFollowup, setNewFollowup] = useState({
    followupDate: new Date().toISOString().split('T')[0],
    nextFollowupDate: '',
    content: ''
  });
  const [editForm, setEditForm] = useState({
    phone: '',
    address: '',
    diseases: '',
    medications: ''
  });

  // 从路由参数获取用户ID
  const userId = $w.page.dataset.params?.id;

  // 从数据模型查询用户数据
  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const result = await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaGetItemV2',
        params: {
          filter: {
            where: {
              $and: [{
                _id: {
                  $eq: userId
                }
              }]
            }
          },
          select: {
            $master: true
          }
        }
      });
      if (result) {
        setUserData(result);
      } else {
        toast({
          title: '用户不存在',
          description: '未找到该用户信息',
          variant: 'destructive',
          duration: 1000
        });
        $w.utils.navigateBack();
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
  const handleBack = () => {
    $w.utils.navigateBack();
  };
  const handleAddFollowup = () => {
    setShowFollowupDialog(true);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    setNewFollowup(prev => ({
      ...prev,
      nextFollowupDate: nextDate.toISOString().split('T')[0]
    }));
  };
  const handleSaveFollowup = async () => {
    if (!newFollowup.nextFollowupDate || !newFollowup.content) {
      toast({
        title: '输入不完整',
        description: '请填写下次随访日期和随访内容',
        variant: 'destructive',
        duration: 1000
      });
      return;
    }
    try {
      setSaving(true);
      // 更新数据模型中的随访记录
      const updatedFollowups = userData.followups ? [...userData.followups] : [];
      updatedFollowups.push({
        followupDate: newFollowup.followupDate,
        nextFollowupDate: newFollowup.nextFollowupDate,
        content: newFollowup.content
      });
      await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            followups: updatedFollowups
          },
          filter: {
            where: {
              $and: [{
                _id: {
                  $eq: userId
                }
              }]
            }
          }
        }
      });

      // 更新本地数据
      setUserData(prev => ({
        ...prev,
        followups: updatedFollowups
      }));
      toast({
        title: '保存成功',
        description: '随访记录已保存',
        variant: 'default',
        duration: 1000
      });
      setShowFollowupDialog(false);
      setNewFollowup({
        followupDate: new Date().toISOString().split('T')[0],
        nextFollowupDate: '',
        content: ''
      });
    } catch (error) {
      console.error('保存随访记录失败:', error);
      toast({
        title: '保存失败',
        description: '无法保存随访记录，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setSaving(false);
    }
  };
  const handleOpenBasicEdit = () => {
    setEditForm({
      phone: userData.phone || '',
      address: userData.address || '',
      diseases: userData.diseases ? userData.diseases.join('、') : '',
      medications: userData.medications ? userData.medications.join('\n') : ''
    });
    setShowBasicEditDialog(true);
  };
  const handleSaveBasicEdit = async () => {
    if (!editForm.phone || !editForm.address) {
      toast({
        title: '输入不完整',
        description: '请填写电话和地址',
        variant: 'destructive',
        duration: 1000
      });
      return;
    }
    try {
      setSaving(true);
      // 更新数据模型中的基本信息
      await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            phone: editForm.phone,
            address: editForm.address
          },
          filter: {
            where: {
              $and: [{
                _id: {
                  $eq: userId
                }
              }]
            }
          }
        }
      });

      // 更新本地数据
      setUserData(prev => ({
        ...prev,
        phone: editForm.phone,
        address: editForm.address
      }));
      toast({
        title: '保存成功',
        description: '基本信息已更新',
        variant: 'default',
        duration: 1000
      });
      setShowBasicEditDialog(false);
    } catch (error) {
      console.error('保存基本信息失败:', error);
      toast({
        title: '保存失败',
        description: '无法保存基本信息，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setSaving(false);
    }
  };
  const handleOpenHealthEdit = () => {
    setEditForm({
      phone: '',
      address: '',
      diseases: userData.diseases ? userData.diseases.join('、') : '',
      medications: userData.medications ? userData.medications.join('\n') : ''
    });
    setShowHealthEditDialog(true);
  };
  const handleSaveHealthEdit = async () => {
    if (!editForm.diseases || !editForm.medications) {
      toast({
        title: '输入不完整',
        description: '请填写基础疾病和用药情况',
        variant: 'destructive',
        duration: 1000
      });
      return;
    }
    try {
      setSaving(true);
      const diseasesArray = editForm.diseases.split('、').map(d => d.trim()).filter(d => d);
      const medicationsArray = editForm.medications.split('\n').map(m => m.trim()).filter(m => m);

      // 更新数据模型中的健康档案
      await $w.cloud.callDataSource({
        dataSourceName: 'user',
        methodName: 'wedaUpdateV2',
        params: {
          data: {
            diseases: diseasesArray,
            medications: medicationsArray
          },
          filter: {
            where: {
              $and: [{
                _id: {
                  $eq: userId
                }
              }]
            }
          }
        }
      });

      // 更新本地数据
      setUserData(prev => ({
        ...prev,
        diseases: diseasesArray,
        medications: medicationsArray
      }));
      toast({
        title: '保存成功',
        description: '健康档案已更新',
        variant: 'default',
        duration: 1000
      });
      setShowHealthEditDialog(false);
    } catch (error) {
      console.error('保存健康档案失败:', error);
      toast({
        title: '保存失败',
        description: '无法保存健康档案，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setSaving(false);
    }
  };
  const formatDate = dateStr => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  if (loading) {
    return <div style={style} className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    </div>;
  }
  if (!userData) {
    return <div style={style} className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <User className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500">用户不存在</p>
        <Button onClick={handleBack} className="mt-3">返回</Button>
      </div>
    </div>;
  }
  return <div style={style} className="min-h-screen bg-gray-50 pb-16">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleBack} className="p-2 mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold text-gray-800">用户详情</h1>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* 用户基本信息 */}
        <Card className="border-gray-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-500" />
              基本信息
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleOpenBasicEdit} className="h-7 w-7 p-0">
              <Edit3 className="h-3.5 w-3.5 text-blue-500" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-medium">{userData.name ? userData.name.charAt(0) : '?'}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{userData.name || '未命名用户'}</p>
                <p className="text-xs text-gray-500">用户ID: {userId}</p>
              </div>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-3.5 w-3.5 mr-2 text-blue-500" />
              <span className="text-xs">{userData.phone || '未设置手机号'}</span>
            </div>

            <div className="flex items-start text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 mr-2 text-green-500 mt-0.5" />
              <span className="text-xs">{userData.address || '未设置地址'}</span>
            </div>
          </CardContent>
        </Card>

        {/* 健康档案 */}
        <Card className="border-gray-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <Pill className="h-4 w-4 mr-2 text-green-500" />
              健康档案
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleOpenHealthEdit} className="h-7 w-7 p-0">
              <Edit3 className="h-3.5 w-3.5 text-green-500" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center mb-1.5">
                <span className="text-xs font-medium text-gray-700">基础疾病</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {userData.diseases && userData.diseases.length > 0 ? userData.diseases.map((disease, index) => <Badge key={index} variant="secondary" className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-0.5">
                    {disease}
                  </Badge>) : <span className="text-xs text-gray-400">暂无基础疾病</span>}
              </div>
            </div>

            <div>
              <div className="flex items-center mb-1.5">
                <span className="text-xs font-medium text-gray-700">用药情况</span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                {userData.medications && userData.medications.length > 0 ? userData.medications.map((medication, index) => <div key={index} className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
                    <span>{medication}</span>
                  </div>) : <span className="text-xs text-gray-400">暂无用药记录</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 随访记录 */}
        <Card className="border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-orange-500" />
              随访记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userData.followups && userData.followups.length > 0 ? <div className="space-y-3">
                {userData.followups.map((followup, index) => <div key={index} className="border-l-3 border-blue-400 pl-3 py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {followup.followupDate ? formatDate(followup.followupDate) : '未设置日期'}
                      </span>
                      {followup.nextFollowupDate && <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs px-1.5 py-0">
                        下次: {formatDate(followup.nextFollowupDate)}
                      </Badge>}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {followup.content || '无随访内容'}
                    </p>
                  </div>)}
              </div> : <div className="text-center py-4 text-gray-500">
                <p className="text-xs">暂无随访记录</p>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* 底部新增随访按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
        <Button onClick={handleAddFollowup} className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm" disabled={saving}>
          {saving ? <Loader className="h-4 w-4 animate-spin" /> : '新增随访记录'}
        </Button>
      </div>

      {/* 基本信息编辑弹窗 */}
      <Dialog open={showBasicEditDialog} onOpenChange={setShowBasicEditDialog}>
        <DialogContent className="w-[95%] max-w-[360px] mx-auto my-4">
          <DialogHeader>
            <DialogTitle className="text-base">修改基本信息</DialogTitle>
            <DialogDescription className="text-xs">
              修改用户的电话和地址信息
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editPhone" className="text-sm">手机号</Label>
              <Input id="editPhone" type="tel" value={editForm.phone} onChange={e => setEditForm(prev => ({
              ...prev,
              phone: e.target.value
            }))} className="h-10 text-sm" placeholder="请输入手机号" disabled={saving} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editAddress" className="text-sm">地址</Label>
              <Input id="editAddress" value={editForm.address} onChange={e => setEditForm(prev => ({
              ...prev,
              address: e.target.value
            }))} className="h-10 text-sm" placeholder="请输入详细地址" disabled={saving} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBasicEditDialog(false)} disabled={saving}>
              取消
            </Button>
            <Button size="sm" onClick={handleSaveBasicEdit} disabled={saving}>
              {saving ? <Loader className="h-4 w-4 animate-spin mr-1" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 健康档案编辑弹窗 */}
      <Dialog open={showHealthEditDialog} onOpenChange={setShowHealthEditDialog}>
        <DialogContent className="w-[95%] max-w-[360px] mx-auto my-4">
          <DialogHeader>
            <DialogTitle className="text-base">修改健康档案</DialogTitle>
            <DialogDescription className="text-xs">
              修改基础疾病和用药情况
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editDiseases" className="text-sm">基础疾病</Label>
              <Input id="editDiseases" value={editForm.diseases} onChange={e => setEditForm(prev => ({
              ...prev,
              diseases: e.target.value
            }))} className="h-10 text-sm" placeholder="多个疾病用、分隔" disabled={saving} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editMedications" className="text-sm">用药情况</Label>
              <Textarea id="editMedications" value={editForm.medications} onChange={e => setEditForm(prev => ({
              ...prev,
              medications: e.target.value
            }))} rows={3} className="text-sm resize-none" placeholder="每行一种用药，格式：药名-用法" disabled={saving} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHealthEditDialog(false)} disabled={saving}>
              取消
            </Button>
            <Button size="sm" onClick={handleSaveHealthEdit} disabled={saving}>
              {saving ? <Loader className="h-4 w-4 animate-spin mr-1" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增随访弹窗 */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent className="w-[95%] max-w-[360px] mx-auto my-4">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-blue-500" />
              新增随访记录
            </DialogTitle>
            <DialogDescription className="text-xs">
              填写本次随访内容和下次随访时间
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="followupDate" className="text-sm">本次随访日期</Label>
              <Input id="followupDate" type="date" value={newFollowup.followupDate} onChange={e => setNewFollowup(prev => ({
              ...prev,
              followupDate: e.target.value
            }))} className="h-10 text-sm" disabled={saving} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nextFollowupDate" className="text-sm">下次随访日期</Label>
              <Input id="nextFollowupDate" type="date" value={newFollowup.nextFollowupDate} onChange={e => setNewFollowup(prev => ({
              ...prev,
              nextFollowupDate: e.target.value
            }))} className="h-10 text-sm" min={newFollowup.followupDate} disabled={saving} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-sm">随访内容</Label>
              <Textarea id="content" placeholder="请输入本次随访的具体内容和建议..." value={newFollowup.content} onChange={e => setNewFollowup(prev => ({
              ...prev,
              content: e.target.value
            }))} rows={3} className="text-sm resize-none" disabled={saving} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFollowupDialog(false)} disabled={saving}>
              取消
            </Button>
            <Button size="sm" onClick={handleSaveFollowup} disabled={saving}>
              {saving ? <Loader className="h-4 w-4 animate-spin mr-1" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}