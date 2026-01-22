const { NestFactory } = require('@nestjs/core');
const { PlanningModule } = require('./planning/planning.module');
const { AnalyticsService } = require('./planning/analytics.service');
const { AppModule } = require('./app.module');

async function debug() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const analyticsService = app.get(AnalyticsService);

    console.log('--- START DASHBOARD DEBUG ---');
    try {
        const stats = await analyticsService.getDashboardStats(1, 1, 2026);
        console.log('Projects Count:', stats.projectsStats.length);
        console.log('Hierarchy Groups:', stats.hierarchyBreakdown.length);
        console.log('First Project:', JSON.stringify(stats.projectsStats[0], null, 2));
    } catch (err) {
        console.error(err);
    }
    console.log('--- END DASHBOARD DEBUG ---');
    await app.close();
}

debug();
