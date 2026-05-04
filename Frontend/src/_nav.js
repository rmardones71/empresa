import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilNotes, cilPeople, cilShieldAlt, cilSpeedometer } from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Administración',
    roles: ['Super Admin', 'Admin'],
  },
  {
    component: CNavGroup,
    name: 'Usuarios',
    to: '/admin',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: ['Super Admin', 'Admin'],
    items: [
      {
        component: CNavItem,
        name: 'Gestión de usuarios',
        to: '/admin/users',
        roles: ['Super Admin', 'Admin'],
      },
      {
        component: CNavItem,
        name: 'Roles',
        to: '/admin/roles',
        roles: ['Super Admin', 'Admin'],
        icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Auditoría',
        to: '/admin/audit',
        roles: ['Super Admin', 'Admin'],
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
      },
    ],
  },
]

export default _nav

