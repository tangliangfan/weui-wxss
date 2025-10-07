// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle, useToast } from '@/components/ui';
// @ts-ignore;
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage(props) {
  const {
    $w,
    style
  } = props;
  const {
    toast
  } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleLogin = async e => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast({
        title: '输入不完整',
        description: '请填写账号和密码',
        variant: 'destructive',
        duration: 1000
      });
      return;
    }
    setLoading(true);
    try {
      // 调用数据模型查询账号
      const result = await $w.cloud.callDataSource({
        dataSourceName: 'account',
        methodName: 'wedaGetRecordsV2',
        params: {
          filter: {
            where: {
              $and: [{
                username: {
                  $eq: formData.username
                }
              }, {
                password: {
                  $eq: formData.password
                }
              }]
            }
          },
          select: {
            $master: true
          },
          getCount: true
        }
      });

      // 正确解析返回的数据结构
      if (result && result.records && result.records.length > 0) {
        const user = result.records[0];
        toast({
          title: '登录成功',
          description: `欢迎回来，${user.name || user.username}！`,
          variant: 'default',
          duration: 1000
        });

        // 登录成功后跳转到首页
        setTimeout(() => {
          $w.utils.redirectTo({
            pageId: 'home',
            params: {}
          });
        }, 1000);
      } else {
        toast({
          title: '登录失败',
          description: '账号或密码错误，请检查后重试',
          variant: 'destructive',
          duration: 1000
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      toast({
        title: '登录错误',
        description: '网络连接异常，请稍后重试',
        variant: 'destructive',
        duration: 1000
      });
    } finally {
      setLoading(false);
    }
  };
  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };
  return <div style={style} className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] mx-auto">
        <Card className="w-full shadow-lg rounded-2xl border-0">
          <CardHeader className="space-y-3 text-center pt-8 pb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 bg-[url('https://healthmanagementinfosys01-0ae99f-1381435234.tcloudbaseapp.com/resources/2025-10/lowcode-2381039')] bg-cover bg-center bg-no-repeat">
            </div>
            <CardTitle className="text-xl font-bold text-gray-800">健管师服务管理信息系统</CardTitle>
            <CardDescription className="text-sm text-gray-600 px-4">
              健管师服务管理信息系统登录
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  账号
                </label>
                <Input type="text" placeholder="请输入账号" value={formData.username} onChange={e => handleInputChange('username', e.target.value)} onKeyPress={handleKeyPress} className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-base" disabled={loading} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  密码
                </label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="请输入密码" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} onKeyPress={handleKeyPress} className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-base pr-12" disabled={loading} />
                  <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors text-base" disabled={loading}>
                {loading ? <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    登录中...
                  </div> : '登录'}
              </Button>
            </form>

            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                账号申请：联系系统开发人员或管理员
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}