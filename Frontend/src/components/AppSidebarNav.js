import React from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CSidebarNav } from '@coreui/react'
import { useSelector } from 'react-redux'
import { hasPermission } from 'src/utils/permissions'

export const AppSidebarNav = ({ items }) => {
  const user = useSelector((s) => s.auth.user)

  const isAllowed = (item) => {
    if (item?.items?.length) return item.items.some(isAllowed)
    return hasPermission(user, item?.permissionKey, 'read')
  }
  const navLink = (name, icon, badge, indent = false) => {
    return (
      <>
        {icon
          ? icon
          : indent && (
              <span className="nav-icon">
                <span className="nav-icon-bullet"></span>
              </span>
            )}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto" size="sm">
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, permissionKey, ...rest } = item
    const Component = component
    if (!Component) return null
    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            {...rest}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, permissionKey, ...rest } = item
    const Component = component
    if (!isAllowed(item)) return null
    if (!Component) return null
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {items
          ?.filter(isAllowed)
          .map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index, true)))}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {items &&
        items
          .filter(isAllowed)
          .map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
