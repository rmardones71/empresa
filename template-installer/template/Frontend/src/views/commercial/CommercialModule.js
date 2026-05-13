import React from 'react'
import { CCard, CCardBody, CCardHeader, CCardText, CCardTitle } from '@coreui/react'
import { useLocation } from 'react-router-dom'

const titlesByPath = {
  '/commercial/empresas': 'Empresas',
  '/commercial/contactos': 'Contactos',
  '/commercial/contratos_empresa': 'Contratos',
  '/commercial/lineas': 'Lineas de contrato',
  '/commercial/casos': 'Casos',
  '/commercial/documentos': 'Documentos',
  '/commercial/categorias': 'Categorias',
  '/commercial/tipo_contactos': 'Tipos de contacto',
  '/commercial/estado_contactos': 'Estados de contacto',
  '/commercial/estado_vitales': 'Estados vitales',
  '/commercial/estados_ctr': 'Estados de contrato',
  '/commercial/tipo_servicios': 'Tipos de servicio',
  '/commercial/tipo_tarifas': 'Tipos de tarifa',
  '/commercial/frecuencias': 'Frecuencias',
}

const CommercialModule = () => {
  const location = useLocation()
  const title = titlesByPath[location.pathname] || 'Modulo base'

  return (
    <CCard>
      <CCardHeader>
        <CCardTitle className="mb-0">{title}</CCardTitle>
      </CCardHeader>
      <CCardBody>
        <CCardText className="text-body-secondary mb-0">
          Pantalla placeholder disponible para implementar la logica del proyecto destino.
        </CCardText>
      </CCardBody>
    </CCard>
  )
}

export default CommercialModule
