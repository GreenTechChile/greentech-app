// Comunas de Chile organizadas por ciudad/región

export const CIUDADES = [
  'Santiago',
  'Valparaíso',
  'Viña del Mar',
  'Concepción',
  'La Serena',
  'Antofagasta',
  'Temuco',
  'Rancagua',
  'Talca',
  'Arica',
  'Iquique',
  'Puerto Montt',
  'Chillán',
  'Osorno',
  'Valdivia',
  'Copiapó',
  'Punta Arenas',
  'Coyhaique',
]

export const COMUNAS_POR_CIUDAD: Record<string, string[]> = {
  'Santiago': [
    'Cerrillos','Cerro Navia','Conchalí','El Bosque','Estación Central',
    'Huechuraba','Independencia','La Cisterna','La Florida','La Granja',
    'La Pintana','La Reina','Las Condes','Lo Barnechea','Lo Espejo',
    'Lo Prado','Macul','Maipú','Ñuñoa','Pedro Aguirre Cerda',
    'Peñalolén','Providencia','Pudahuel','Quilicura','Quinta Normal',
    'Recoleta','Renca','San Joaquín','San Miguel','San Ramón',
    'Santiago','Vitacura',
    // Comunas del Gran Santiago
    'Colina','Lampa','Tiltil','San Bernardo','Buin','Paine',
    'Calera de Tango','Pirque','Puente Alto','San José de Maipo',
    'El Monte','Isla de Maipo','Melipilla','Padre Hurtado',
    'Peñaflor','Talagante','Alhué','Curacaví','María Pinto',
  ],
  'Valparaíso': [
    'Valparaíso','Casablanca','Juan Fernández','Puchuncaví',
    'Quintero','Villa Alemana','Quilpué',
  ],
  'Viña del Mar': [
    'Viña del Mar','Concón','Limache','Olmué',
  ],
  'Concepción': [
    'Concepción','Coronel','Chiguayante','Florida','Hualpén',
    'Hualqui','Lota','Penco','San Pedro de la Paz','Santa Juana',
    'Talcahuano','Tomé','San Rosendo',
  ],
  'La Serena': [
    'La Serena','Andacollo','Coquimbo','La Higuera',
    'Paihuano','Vicuña',
  ],
  'Antofagasta': [
    'Antofagasta','Calama','Mejillones','Ollague',
    'San Pedro de Atacama','Sierra Gorda','Taltal','Tocopilla',
  ],
  'Temuco': [
    'Temuco','Carahue','Cunco','Curarrehue','Freire',
    'Galvarino','Gorbea','Lautaro','Loncoche','Melipeuco',
    'Nueva Imperial','Padre las Casas','Perquenco','Pitrufquén',
    'Pucón','Saavedra','Teodoro Schmidt','Toltén','Vilcún',
    'Villarrica','Cholchol',
  ],
  'Rancagua': [
    'Rancagua','Codegua','Coinco','Coltauco','Doñihue',
    'Graneros','Las Cabras','Machalí','Malloa','Mostazal',
    'Olivar','Peumo','Pichidegua','Quinta de Tilcoco','Requínoa',
    'Rengo','San Vicente',
  ],
  'Talca': [
    'Talca','Constitución','Curepto','Empedrado','Maule',
    'Pelarco','Pencahue','Río Claro','San Clemente','San Rafael',
  ],
  'Arica': ['Arica','Camarones','General Lagos','Putre'],
  'Iquique': ['Iquique','Alto Hospicio','Camiña','Colchane','Huara','Pica','Pozo Almonte'],
  'Puerto Montt': [
    'Puerto Montt','Calbuco','Cochamó','Fresia','Frutillar',
    'Los Muermos','Llanquihue','Maullín','Puerto Varas',
  ],
  'Chillán': [
    'Chillán','Bulnes','Cobquecura','Coelemu','Coihueco',
    'Chillán Viejo','El Carmen','Ninhue','Ñiquén','Pemuco',
    'Pinto','Portezuelo','Quillón','Quirihue','Ránquil',
    'San Carlos','San Fabián','San Ignacio','San Nicolás',
    'Treguaco','Yungay',
  ],
  'Osorno': [
    'Osorno','Puerto Octay','Purranque','Puyehue',
    'Río Negro','San Juan de la Costa','San Pablo',
  ],
  'Valdivia': [
    'Valdivia','Corral','Futrono','La Unión','Lago Ranco',
    'Lanco','Los Lagos','Máfil','Mariquina','Paillaco','Panguipulli',
  ],
  'Copiapó': [
    'Copiapó','Caldera','Chañaral','Diego de Almagro',
    'Freirina','Huasco','Tierra Amarilla','Vallenar',
  ],
  'Punta Arenas': [
    'Punta Arenas','Laguna Blanca','Río Verde','San Gregorio',
    'Cabo de Hornos','Antártica','Porvenir','Primavera',
    'Timaukel','Natales','Torres del Paine',
  ],
  'Coyhaique': [
    'Coyhaique','Aysén','Chile Chico','Cisnes','Cochrane',
    'Guaitecas','Lago Verde','O\'Higgins','Río Ibáñez','Tortel',
  ],
}
