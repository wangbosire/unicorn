export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/collections/index',
    'pages/profile/index',
    'pages/activate/index',
    'pages/collection-edit/index',
    'pages/collection-public/index',
    'pages/messages/index',
    'pages/transfers/index',
  ],
  window: {
    navigationBarTitleText: 'Unicorn',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    color: '#64748b',
    selectedColor: '#0891b2',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/collections/index',
        text: '藏品',
        iconPath: 'assets/tab/collections.png',
        selectedIconPath: 'assets/tab/collections-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab/profile.png',
        selectedIconPath: 'assets/tab/profile-active.png',
      },
    ],
  },
});
