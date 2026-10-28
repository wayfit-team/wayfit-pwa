import { Navigate, createBrowserRouter, type RouteObject } from 'react-router'
import { CouponDetailPage } from './features/coupons/CouponDetailPage'
import { CouponListPage } from './features/coupons/CouponListPage'
import { DashboardPage } from './features/owner/DashboardPage'
import { LoginPage } from './features/owner/LoginPage'
import { OwnerLayout } from './features/owner/OwnerLayout'
import { StorePage } from './features/owner/StorePage'
import { PairPage } from './features/pair/PairPage'
import { SettingsPage } from './features/settings/SettingsPage'

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/coupons" replace /> },
  // 운전자 쿠폰 지갑
  { path: '/pair', element: <PairPage /> },
  { path: '/coupons', element: <CouponListPage /> },
  { path: '/coupons/:id', element: <CouponDetailPage /> },
  { path: '/settings', element: <SettingsPage /> },
  // 사장님 웹
  { path: '/owner/login', element: <LoginPage /> },
  {
    path: '/owner',
    element: <OwnerLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'store', element: <StorePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/coupons" replace /> },
]

export const createRouter = () => createBrowserRouter(routes)
