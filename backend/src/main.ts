import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(process.cwd(), '.env') });
import './dns-preflight';
import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getModelToken } from '@nestjs/mongoose';
import { Role, RoleDocument } from './modules/roles/role.schema';
import { seedRoles } from './common/seed/seed-roles';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ SERVIR LES FICHIERS UPLOADÉS STATIQUEMENT
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ✅ ACTIVER CORS POUR ANGULAR
  app.enableCors({
    origin: 'http://localhost:4200', // Angular
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Mediflow API')
    .setDescription(
      'API for Mediflow backend. Import in Postman via Import → Link → {{baseUrl}}/api-json',
    )
    .setVersion('1.0')
    .addTag('auth', 'Sign up, sign in, password reset')
    .addTag('users', 'User CRUD and avatar')
    .addTag('roles', 'Role CRUD')
    .addTag('upload', 'File upload')
    .addTag('alerts', 'Clinical alerts (list, acknowledge)')
    .addTag('reminders', 'Patient reminders (list, complete)')
    .addTag('vitals', 'Vital signs (nurse-assisted entry, verify)')
    .addTag('symptoms', 'Symptom reports (nurse-assisted entry, verify)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const roleModel = app.get<Model<RoleDocument>>(getModelToken(Role.name));
  await seedRoles(roleModel);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Listening on http://localhost:${port} — check active DB: GET http://localhost:${port}/database`,
  );
}

bootstrap();
