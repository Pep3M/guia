import { beforeAll, afterAll } from 'vitest'

// Setup para tests de integración
beforeAll(async () => {
  // Aquí se pueden hacer setup de DB, servicios externos, etc.
  // Por ejemplo: limpiar y preparar la base de datos de pruebas
})

afterAll(async () => {
  // Cleanup después de todos los tests
  // Por ejemplo: desconectar de la base de datos
})

