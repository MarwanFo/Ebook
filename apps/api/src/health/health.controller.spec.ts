import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  const mockPrismaService = {
    ping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLiveness (/health)', () => {
    it('should return liveness status without calling the database', () => {
      const result = controller.checkLiveness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.timestamp).toBe('string');
      expect(prismaService.ping).not.toHaveBeenCalled();
    });
  });

  describe('checkReadiness (/ready)', () => {
    it('should return readiness status when database ping succeeds', async () => {
      mockPrismaService.ping.mockResolvedValue(true);

      const result = await controller.checkReadiness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(mockPrismaService.ping).toHaveBeenCalledTimes(1);
    });

    it('should throw ServiceUnavailableException when database ping fails', async () => {
      mockPrismaService.ping.mockResolvedValue(false);

      await expect(controller.checkReadiness()).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrismaService.ping).toHaveBeenCalledTimes(1);
    });
  });
});
