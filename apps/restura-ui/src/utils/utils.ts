import {
	StringUtils as BaseStringUtils,
	ObjectUtils as BaseObjectUtils,
	RegionUtils as BaseRegionUtils,
	WebUtils as BaseWebUtils,
	DateUtils as BaseDateUtils
} from '@redskytech/framework/utils';

class StringUtils extends BaseStringUtils {
	static sanitizeParameter(param: string): string {
		return param.replace(/[$#]/g, '');
	}
}

class ObjectUtils extends BaseObjectUtils {}

class RegionUtils extends BaseRegionUtils {}

class WebUtils extends BaseWebUtils {}

class DateUtils extends BaseDateUtils {}

export { StringUtils, ObjectUtils, RegionUtils, WebUtils, DateUtils };
