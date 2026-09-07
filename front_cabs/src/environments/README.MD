# ENVIROMENT

En este documetno lo que encontramos son como el sistema esta
Configurado, tanto lo que es la seguridad de este como el crifrado

El enviroment consta de las sigueintes caracteristicas
- manejo y flujo de la cookies para la produccion 
- Timeouts de seguridad mas estrictos(de los q12 minutos hasta los 2 de refresh)
- Rate Limiting estricto, lo que permite eficientar la cantidad de peticiones
solicitadas sobre el propio sistema
- Url permitidas en el Cors, principalemten epsecificadas para la produccion
- Loggin de minimo en produccion lo que administrara las gente que use el sistema
- No almacenamiento de token en el fronten usa Httponly
- CSRF en proteccion

> [!NOTE]
> Cada una de estas caracterisiticas cumple con los requisitos necesarios
para poder hacer un despliegue mas limpio y seguro a la hora
de pasar a producciones, ya que las variables de entorno

### Despliegue seguro cno evniroment
```
1. Define modelo/interface en core/models/ en  produccion
2. Crear servicio en el propio sistema si no los hay
3. Maneja cifrado y ecnriptacion de datos
4.Admnistra la rutas autorizadas del sistema dentro de esta
5. Configurar el manejo de cookies del navegador web
```

