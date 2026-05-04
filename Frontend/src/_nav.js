import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilAddressBook,
  cilBriefcase,
  cilBuilding,
  cilDescription,
  cilFile,
  cilIndustry,
  cilList,
  cilNotes,
  cilPeople,
  cilShieldAlt,
  cilSpeedometer,
  cilUser,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const adminRoles = ['Super Admin', 'Admin']

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Administracion',
    roles: adminRoles,
  },
  {
    component: CNavGroup,
    name: 'Gestion comercial',
    to: '/commercial',
    icon: <CIcon icon={cilBriefcase} customClassName="nav-icon" />,
    roles: adminRoles,
    items: [
      {
        component: CNavItem,
        name: 'Empresas',
        to: '/commercial/empresas',
        icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
        roles: adminRoles,
      },
      {
        component: CNavItem,
        name: 'Contactos',
        to: '/commercial/contactos',
        icon: <CIcon icon={cilAddressBook} customClassName="nav-icon" />,
        roles: adminRoles,
      },
      {
        component: CNavItem,
        name: 'Contratos',
        to: '/commercial/contratos',
        icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
        roles: adminRoles,
      },
      {
        component: CNavItem,
        name: 'Lineas',
        to: '/commercial/lineas',
        icon: <CIcon icon={cilList} customClassName="nav-icon" />,
        roles: adminRoles,
      },
      {
        component: CNavItem,
        name: 'Casos',
        to: '/commercial/casos',
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
        roles: adminRoles,
      },
      {
        component: CNavItem,
        name: 'Documentos',
        to: '/commercial/documentos',
        icon: <CIcon icon={cilFile} customClassName="nav-icon" />,
        roles: adminRoles,
      },
      {
        component: CNavGroup,
        name: 'Tablas maestras',
        to: '/commercial/masters',
        icon: <CIcon icon={cilIndustry} customClassName="nav-icon" />,
        roles: adminRoles,
        items: [
          {
            component: CNavItem,
            name: 'Categorias',
            to: '/commercial/categorias',
            roles: adminRoles,
          },
          {
            component: CNavItem,
            name: 'Tipos contacto',
            to: '/commercial/tipo_contactos',
            roles: adminRoles,
          },
          {
            component: CNavItem,
            name: 'Estados contacto',
            to: '/commercial/estado_contactos',
            roles: adminRoles,
          },
          {
            component: CNavItem,
            name: 'Estados vitales',
            to: '/commercial/estado_vitales',
            roles: adminRoles,
          },
          {
            component: CNavItem,
            name: 'Tipos servicio',
            to: '/commercial/tipo_servicios',
            roles: adminRoles,
          },
          {
            component: CNavItem,
            name: 'Tipos tarifa',
            to: '/commercial/tipo_tarifas',
            roles: adminRoles,
          },
          {
            component: CNavItem,
            name: 'Frecuencias',
            to: '/commercial/frecuencias',
            roles: adminRoles,
          },
        ],
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Usuarios',
    to: '/admin',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: adminRoles,
    items: [
      {
        component: CNavItem,
        name: 'Gestion de usuarios',
        to: '/admin/users',
        roles: adminRoles,
        icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Roles',
        to: '/admin/roles',
        roles: adminRoles,
        icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Auditoria',
        to: '/admin/audit',
        roles: adminRoles,
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
      },
    ],
  },
]

export default _nav
