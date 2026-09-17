import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [provideAnimationsAsync(), provideHttpClient(withInterceptors([authInterceptor])), provideRouter(routes)]
}).catch((error: unknown) => console.error(error));
