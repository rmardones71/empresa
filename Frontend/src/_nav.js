import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilAddressBook,
  cilBriefcase,
  cilBuilding,
  cilDescription,
  cilFile,
  cilFolder,
  cilIndustry,
  cilList,
  cilNotes,
  cilPeople,
  cilShieldAlt,
  cilSpeedometer,
  cilUser,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    permissionKey: 'dashboard.main',
  },
  {
    component: CNavTitle,
    name: 'Administracion',
  },
  {
    component: CNavTitle,
    name: 'Contratos',
  },
  {
    component: CNavItem,
    name: 'Contrato Empresa',
    to: '/contratos-empresa',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    permissionKey: 'commercial.contratos_empresa',
  },
  {
    component: CNavGroup,
    name: 'Gestion comercial',
    to: '/commercial',
    icon: <CIcon icon={cilBriefcase} customClassName="nav-icon" />,
    // Controlado por Matriz de permisos: "Vista Mantenedores (menu)"
    permissionKey: 'ui.view_mantenedores',
    items: [
      {
        component: CNavItem,
        name: 'Empresas',
        to: '/commercial/empresas',
        icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
        permissionKey: 'commercial.empresas',
      },
      {
        component: CNavItem,
        name: 'Contactos',
        to: '/commercial/contactos',
        icon: <CIcon icon={cilAddressBook} customClassName="nav-icon" />,
        permissionKey: 'commercial.contactos',
      },
      {
        component: CNavItem,
        name: 'Contratos',
        to: '/commercial/contratos_empresa',
        icon: <CIcon icon={cilFolder} customClassName="nav-icon" />,
        permissionKey: 'commercial.contratos_empresa',
      },
      {
        component: CNavItem,
        name: 'Lineas',
        to: '/commercial/lineas',
        icon: <CIcon icon={cilList} customClassName="nav-icon" />,
        permissionKey: 'commercial.lineas',
      },
      {
        component: CNavItem,
        name: 'Casos',
        to: '/commercial/casos',
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
        permissionKey: 'commercial.casos',
      },
      {
        component: CNavItem,
        name: 'Documentos',
        to: '/commercial/documentos',
        icon: <CIcon icon={cilFile} customClassName="nav-icon" />,
        permissionKey: 'commercial.documentos',
      },
      {
        component: CNavGroup,
        name: 'Tablas maestras',
        to: '/commercial/masters',
        icon: <CIcon icon={cilIndustry} customClassName="nav-icon" />,
        items: [
          {
            component: CNavItem,
            name: 'Categorias',
            to: '/commercial/categorias',
            permissionKey: 'commercial.categorias',
          },
          {
            component: CNavItem,
            name: 'Tipos contacto',
            to: '/commercial/tipo_contactos',
            permissionKey: 'commercial.tipo_contactos',
          },
          {
            component: CNavItem,
            name: 'Estados contacto',
            to: '/commercial/estado_contactos',
            permissionKey: 'commercial.estado_contactos',
          },
          {
            component: CNavItem,
            name: 'Estados vitales',
            to: '/commercial/estado_vitales',
            permissionKey: 'commercial.estado_vitales',
          },
          {
            component: CNavItem,
            name: 'Estados contrato',
            to: '/commercial/estados_ctr',
            permissionKey: 'commercial.estados_ctr',
          },
          {
            component: CNavItem,
            name: 'Tipos servicio',
            to: '/commercial/tipo_servicios',
            permissionKey: 'commercial.tipo_servicios',
          },
          {
            component: CNavItem,
            name: 'Tipos tarifa',
            to: '/commercial/tipo_tarifas',
            permissionKey: 'commercial.tipo_tarifas',
          },
          {
            component: CNavItem,
            name: 'Frecuencias',
            to: '/commercial/frecuencias',
            permissionKey: 'commercial.frecuencias',
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
    items: [
      {
        component: CNavItem,
        name: 'Gestion de usuarios',
        to: '/admin/users',
        icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
        permissionKey: 'admin.users',
      },
      {
        component: CNavItem,
        name: 'Roles',
        to: '/admin/roles',
        icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
        permissionKey: 'admin.roles',
      },
      {
        component: CNavItem,
        name: 'Auditoria',
        to: '/admin/audit',
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
        permissionKey: 'admin.audit',
      },
    ],
  },
]

export default _nav
