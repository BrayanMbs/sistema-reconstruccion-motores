import type { PublicOrderTrackingDto, PublicOrderTrackingQueryDto } from "../dtos/admin.dtos";
import { PublicTrackingRepository } from "../repositories/public-tracking.repository";
import { AppError } from "../utils/app-error";

const notFoundMessage = "No se pudo encontrar una orden con los datos proporcionados.";

export class PublicTrackingService {
  private readonly tracking = new PublicTrackingRepository();

  async find(input: PublicOrderTrackingQueryDto): Promise<PublicOrderTrackingDto> {
    const order = await this.tracking.find(input.orderNumber, input.trackingCode);
    if (!order) throw new AppError(notFoundMessage, 404, "PUBLIC_TRACKING_NOT_FOUND");
    return order;
  }
}
